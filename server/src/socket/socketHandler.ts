import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import logger from '../utils/logger';

interface SocketWithUser extends Socket {
  userId?: string;
}

// Map of userId -> socketIds
const activeUsers = new Map<string, string[]>();

export const getActiveUserSockets = (userId: string): string[] => {
  return activeUsers.get(userId.toString()) || [];
};

export const initializeSocket = (io: SocketServer): void => {
  // Authentication middleware for Sockets
  io.use((socket: SocketWithUser, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: Token is missing'));
    }

    try {
      const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default_access_secret_123';
      const decoded = jwt.verify(token, ACCESS_SECRET) as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Token is invalid'));
    }
  });

  io.on('connection', (socket: SocketWithUser) => {
    const userId = socket.userId;
    if (!userId) return;

    logger.info(`User connected to socket: ${userId} (${socket.id})`);

    // Add socket ID to user's list of active sockets (supports multi-device login!)
    const userSockets = activeUsers.get(userId) || [];
    userSockets.push(socket.id);
    activeUsers.set(userId, userSockets);

    // Join user's personal room (for direct notifications / cross-device syncing)
    socket.join(userId);

    // Mark user online in DB and notify contacts
    const setUserOnlineStatus = async () => {
      try {
        const user = await User.findByIdAndUpdate(
          userId,
          { status: 'online' },
          { new: true }
        ).populate('contacts', '_id');
        
        if (user) {
          // Notify contacts that this user is online
          user.contacts.forEach((contact: any) => {
            io.to(contact._id.toString()).emit('user-status-change', {
              userId: user._id,
              status: 'online',
            });
          });
        }
      } catch (err) {
        logger.error('Error setting user status online: %O', err);
      }
    };
    setUserOnlineStatus();

    // Event: Setup user chat connection
    socket.on('setup', () => {
      socket.emit('connected');
    });

    // Event: Join a specific chat room
    socket.on('join-chat', (room: string) => {
      socket.join(room);
      logger.info(`User ${userId} joined room: ${room}`);
    });

    // Event: Leave a specific chat room
    socket.on('leave-chat', (room: string) => {
      socket.leave(room);
      logger.info(`User ${userId} left room: ${room}`);
    });

    // Event: Typing Indicators
    socket.on('typing', (room: string) => {
      socket.to(room).emit('typing', { room, userId });
    });

    socket.on('stop-typing', (room: string) => {
      socket.to(room).emit('stop-typing', { room, userId });
    });

    // WebRTC Signaling Events
    socket.on('call-user', (data: { userToCall: string; signalData: any; from: string; name: string; callType: string; chatId: string }) => {
      logger.info(`Initiating WebRTC call from ${data.from} to ${data.userToCall}`);
      // Send calling notification to all sockets of the user being called
      io.to(data.userToCall).emit('incoming-call', {
        signal: data.signalData,
        from: data.from,
        name: data.name,
        callType: data.callType,
        chatId: data.chatId,
      });
    });

    socket.on('answer-call', (data: { to: string; signal: any }) => {
      logger.info(`Answering WebRTC call. Forwarding signal to ${data.to}`);
      io.to(data.to).emit('call-accepted', {
        signal: data.signal,
      });
    });

    socket.on('reject-call', (data: { to: string }) => {
      logger.info(`Call rejected by user. Notifying caller ${data.to}`);
      io.to(data.to).emit('call-rejected');
    });

    socket.on('end-call', (data: { to: string }) => {
      logger.info(`Call ended. Notifying user ${data.to}`);
      io.to(data.to).emit('call-ended');
    });

    socket.on('ice-candidate', (data: { to: string; candidate: any }) => {
      io.to(data.to).emit('ice-candidate', {
        candidate: data.candidate,
      });
    });

    // Event: Disconnect
    socket.on('disconnect', () => {
      logger.info(`User socket disconnected: ${userId} (${socket.id})`);
      
      const userSockets = activeUsers.get(userId) || [];
      const updatedSockets = userSockets.filter((id) => id !== socket.id);
      
      if (updatedSockets.length === 0) {
        // No active sessions left, mark user offline
        activeUsers.delete(userId);
        
        const setUserOfflineStatus = async () => {
          try {
            const user = await User.findByIdAndUpdate(
              userId,
              { status: 'offline', lastSeen: new Date() },
              { new: true }
            ).populate('contacts', '_id');
            
            if (user) {
              // Notify contacts that this user is offline
              user.contacts.forEach((contact: any) => {
                io.to(contact._id.toString()).emit('user-status-change', {
                  userId: user._id,
                  status: 'offline',
                  lastSeen: user.lastSeen,
                });
              });
            }
          } catch (err) {
            logger.error('Error setting user status offline: %O', err);
          }
        };
        setUserOfflineStatus();
      } else {
        activeUsers.set(userId, updatedSockets);
      }
    });
  });
};
