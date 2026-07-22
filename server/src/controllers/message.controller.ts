import { Request, Response, NextFunction } from 'express';
import Message from '../models/Message';
import Chat from '../models/Chat';
import User from '../models/User';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { uploadFile } from '../services/storage.service';
import mongoose from 'mongoose';

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      chatId, 
      text, 
      messageType = 'text', 
      location, 
      contactCard, 
      poll, 
      parentMessageId 
    } = req.body;

    if (!chatId) {
      throw new BadRequestError('Chat ID is required');
    }

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    // Check if chat exists and user is a participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new NotFoundError('Chat not found');
    }

    const isParticipant = chat.participants.some(
      (id) => id.toString() === currentUserId.toString()
    );
    if (!isParticipant) {
      throw new ForbiddenError('You are not a participant of this chat');
    }

    // Build message data
    const messageData: any = {
      sender: currentUserId,
      chat: chatId,
      messageType,
      text,
    };

    // If file is uploaded via multer
    if (req.file) {
      const fileUrl = await uploadFile(req.file);
      messageData.attachment = {
        url: fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      };
      
      // Auto-detect messageType if default is text
      if (messageType === 'text') {
        if (req.file.mimetype.startsWith('image/')) {
          messageData.messageType = 'image';
        } else if (req.file.mimetype.startsWith('video/')) {
          messageData.messageType = 'video';
        } else if (req.file.mimetype.startsWith('audio/')) {
          messageData.messageType = 'audio';
        } else {
          messageData.messageType = 'document';
        }
      }
    }

    // Location payload
    if (location) {
      const parsedLoc = typeof location === 'string' ? JSON.parse(location) : location;
      messageData.location = parsedLoc;
      messageData.messageType = 'location';
    }

    // Contact Card payload
    if (contactCard) {
      const parsedContact = typeof contactCard === 'string' ? JSON.parse(contactCard) : contactCard;
      messageData.contactCard = parsedContact;
      messageData.messageType = 'contact';
    }

    // Poll payload
    if (poll) {
      const parsedPoll = typeof poll === 'string' ? JSON.parse(poll) : poll;
      messageData.poll = {
        question: parsedPoll.question,
        options: parsedPoll.options.map((opt: string) => ({
          optionId: new mongoose.Types.ObjectId().toString(),
          text: opt,
          votes: [],
        })),
        multipleAnswers: parsedPoll.multipleAnswers || false,
      };
      messageData.messageType = 'poll';
    }

    // Parent Message for reply
    if (parentMessageId) {
      messageData.parentMessage = parentMessageId;
    }

    let message = await Message.create(messageData);
    
    // Update Chat with latest message
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: message._id,
    });

    message = await Message.findById(message._id)
      .populate('sender', 'fullName username email profilePhoto status')
      .populate({
        path: 'parentMessage',
        populate: {
          path: 'sender',
          select: 'fullName username profilePhoto',
        },
      }) as any;

    // Emit socket.io event
    const io = req.app.get('socketio');
    if (io) {
      io.to(message.chat.toString()).emit('message-received', message);
    }

    res.status(201).json({
      status: 'success',
      message,
    });
  } catch (error) {
    next(error);
  }
};

export const fetchMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    // Check participation
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new NotFoundError('Chat not found');
    }

    const isParticipant = chat.participants.some(
      (id) => id.toString() === currentUserId.toString()
    );
    if (!isParticipant) {
      throw new ForbiddenError('You are not a participant of this chat');
    }

    // Fetch messages not deleted by this user
    const messages = await Message.find({
      chat: chatId,
      deletedForUsers: { $ne: currentUserId },
    })
      .populate('sender', 'fullName username email profilePhoto status')
      .populate({
        path: 'parentMessage',
        populate: {
          path: 'sender',
          select: 'fullName username profilePhoto',
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Messages are sorted descending for pagination, reverse to show chronological order
    messages.reverse();

    res.status(200).json({
      status: 'success',
      messages,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
};

export const editMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { messageId, text } = req.body;
    if (!messageId || !text) {
      throw new BadRequestError('Message ID and new text content are required');
    }

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    if (message.sender.toString() !== currentUserId.toString()) {
      throw new ForbiddenError('You can only edit your own messages');
    }

    if (message.deletedForEveryone) {
      throw new BadRequestError('Cannot edit deleted message');
    }

    message.text = text;
    message.isEdited = true;
    await message.save();

    const fullMessage = await Message.findById(message._id)
      .populate('sender', 'fullName username email profilePhoto status')
      .populate({
        path: 'parentMessage',
        populate: {
          path: 'sender',
          select: 'fullName username profilePhoto',
        },
      });

    // Emit socket.io event
    const io = req.app.get('socketio');
    if (io && fullMessage) {
      io.to(fullMessage.chat.toString()).emit('message-edited', fullMessage);
    }

    res.status(200).json({
      status: 'success',
      message: fullMessage,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { messageId, deleteType } = req.body; // deleteType: 'me' | 'everyone'
    if (!messageId || !deleteType) {
      throw new BadRequestError('Message ID and delete type are required');
    }

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    if (deleteType === 'everyone') {
      if (message.sender.toString() !== currentUserId.toString()) {
        throw new ForbiddenError('You can only delete your own messages for everyone');
      }

      message.deletedForEveryone = true;
      message.text = 'This message was deleted';
      message.attachment = undefined;
      message.location = undefined;
      message.contactCard = undefined;
      message.poll = undefined;
      await message.save();
    } else {
      // delete for me
      if (message.deletedForUsers.includes(currentUserId)) {
        throw new BadRequestError('Message is already deleted for you');
      }
      message.deletedForUsers.push(currentUserId);
      await message.save();
    }

    // Emit socket.io event
    const io = req.app.get('socketio');
    if (io) {
      io.to(message.chat.toString()).emit('message-deleted', { 
        messageId, 
        chatId: message.chat, 
        deleteType 
      });
    }

    res.status(200).json({
      status: 'success',
      messageId,
      deleteType,
    });
  } catch (error) {
    next(error);
  }
};

export const reactToMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { messageId, emoji } = req.body;
    if (!messageId) throw new BadRequestError('Message ID is required');

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      throw new NotFoundError('Message not found');
    }

    // Check if reaction from this user already exists
    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.user.toString() === currentUserId.toString()
    );

    if (emoji) {
      if (existingReactionIndex > -1) {
        // Update reaction
        message.reactions[existingReactionIndex].emoji = emoji;
      } else {
        // Add new reaction
        message.reactions.push({ user: currentUserId, emoji });
      }
    } else {
      // Remove reaction if emoji is empty
      if (existingReactionIndex > -1) {
        message.reactions.splice(existingReactionIndex, 1);
      }
    }

    await message.save();

    // Emit socket.io event
    const io = req.app.get('socketio');
    if (io) {
      io.to(message.chat.toString()).emit('reaction-updated', { 
        messageId, 
        chatId: message.chat, 
        reactions: message.reactions 
      });
    }

    res.status(200).json({
      status: 'success',
      messageId,
      reactions: message.reactions,
    });
  } catch (error) {
    next(error);
  }
};

export const voteInPoll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { messageId, optionId } = req.body;
    if (!messageId || !optionId) {
      throw new BadRequestError('Message ID and Option ID are required');
    }

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) throw new NotFoundError('Message not found');
    if (message.messageType !== 'poll' || !message.poll) {
      throw new BadRequestError('Message is not a poll');
    }

    const poll = message.poll;

    // Toggle vote
    poll.options.forEach((opt) => {
      const voteIndex = opt.votes.findIndex((id) => id.toString() === currentUserId.toString());
      if (opt.optionId === optionId) {
        if (voteIndex > -1) {
          // Remove vote
          opt.votes.splice(voteIndex, 1);
        } else {
          // Add vote
          opt.votes.push(currentUserId);
        }
      } else if (!poll.multipleAnswers) {
        // If single choice, remove user votes from all other options
        if (voteIndex > -1) {
          opt.votes.splice(voteIndex, 1);
        }
      }
    });

    // Save
    await message.save();

    // Emit socket.io event
    const io = req.app.get('socketio');
    if (io) {
      io.to(message.chat.toString()).emit('poll-updated', message);
    }

    res.status(200).json({
      status: 'success',
      message,
    });
  } catch (error) {
    next(error);
  }
};
