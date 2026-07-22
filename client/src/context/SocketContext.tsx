import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import useAuthStore from '../store/useAuthStore';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Record<string, 'online' | 'offline' | 'away' | 'dnd'>;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  sendTyping: (chatId: string) => void;
  sendStopTyping: (chatId: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: {},
  joinChat: () => {},
  leaveChat: () => {},
  sendTyping: () => {},
  sendStopTyping: () => {},
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, 'online' | 'offline' | 'away' | 'dnd'>>({});
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Connect Socket.io client
    const socketUrl = window.location.origin; // Using proxy in vite
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket server');
      newSocket.emit('setup');
    });

    // Listen for online status updates
    newSocket.on('user-status-change', (data: { userId: string; status: 'online' | 'offline' | 'away' | 'dnd' }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [data.userId]: data.status,
      }));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  const joinChat = (chatId: string) => {
    if (socket) socket.emit('join-chat', chatId);
  };

  const leaveChat = (chatId: string) => {
    if (socket) socket.emit('leave-chat', chatId);
  };

  const sendTyping = (chatId: string) => {
    if (socket) socket.emit('typing', chatId);
  };

  const sendStopTyping = (chatId: string) => {
    if (socket) socket.emit('stop-typing', chatId);
  };

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, joinChat, leaveChat, sendTyping, sendStopTyping }}>
      {children}
    </SocketContext.Provider>
  );
};
