import { Request, Response, NextFunction } from 'express';
import Chat from '../models/Chat';
import User from '../models/User';
import Message from '../models/Message';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import crypto from 'crypto';

export const accessChat = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.body;
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    // Check if chat already exists
    let isChat = await Chat.findOne({
      isGroupChat: false,
      isChannel: false,
      $and: [
        { participants: { $elemMatch: { $eq: currentUserId } } },
        { participants: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('participants', 'fullName username email profilePhoto status lastSeen about')
      .populate('latestMessage');

    isChat = await User.populate(isChat, {
      path: 'latestMessage.sender',
      select: 'fullName username email profilePhoto status',
    }) as any;

    if (isChat) {
      res.status(200).json({ status: 'success', chat: isChat });
      return;
    }

    // Create new chat
    const chatData = {
      chatName: 'sender',
      isGroupChat: false,
      participants: [currentUserId, userId],
    };

    const createdChat = await Chat.create(chatData);
    const fullChat = await Chat.findById(createdChat._id).populate(
      'participants',
      'fullName username email profilePhoto status lastSeen about'
    );

    res.status(201).json({
      status: 'success',
      chat: fullChat,
    });
  } catch (error) {
    next(error);
  }
};

export const fetchChats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    let chats = await Chat.find({
      participants: { $elemMatch: { $eq: currentUserId } },
    })
      .populate('participants', 'fullName username email profilePhoto status lastSeen about themePreference accentColor')
      .populate('admins', 'fullName username email profilePhoto')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });

    chats = await User.populate(chats, {
      path: 'latestMessage.sender',
      select: 'fullName username email profilePhoto status',
    }) as any;

    res.status(200).json({
      status: 'success',
      chats,
    });
  } catch (error) {
    next(error);
  }
};

export const createGroupChat = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new BadRequestError('User context not found');
    const { chatName, participants: participantsRaw, chatDescription, chatImage } = req.body;

    if (!chatName) {
      throw new BadRequestError('Group name is required');
    }

    let participants: string[] = [];
    if (participantsRaw) {
      participants = typeof participantsRaw === 'string' ? JSON.parse(participantsRaw) : participantsRaw;
    }

    if (participants.length < 1) {
      throw new BadRequestError('At least 1 other user is required to form a group');
    }

    // Add current user to group
    participants.push(req.user._id.toString());

    // Generate random invite code
    const inviteCode = crypto.randomBytes(8).toString('hex');

    const groupChat = await Chat.create({
      chatName,
      chatDescription: chatDescription || '',
      chatImage: chatImage || '',
      isGroupChat: true,
      participants,
      admins: [req.user._id],
      inviteCode,
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate('participants', 'fullName username email profilePhoto status lastSeen about')
      .populate('admins', 'fullName username email profilePhoto');

    res.status(201).json({
      status: 'success',
      chat: fullGroupChat,
    });
  } catch (error) {
    next(error);
  }
};

export const renameGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { chatId, chatName } = req.body;
    if (!chatId || !chatName) {
      throw new BadRequestError('Chat ID and group name are required');
    }

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    // Check if user is admin
    const group = await Chat.findById(chatId);
    if (!group) throw new NotFoundError('Group not found');
    if (!group.isGroupChat) throw new BadRequestError('This is not a group chat');

    const isAdmin = group.admins.some((id) => id.toString() === currentUserId.toString());
    if (!isAdmin) {
      throw new ForbiddenError('Only admins can rename the group');
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName },
      { new: true }
    )
      .populate('participants', 'fullName username email profilePhoto status lastSeen about')
      .populate('admins', 'fullName username email profilePhoto');

    res.status(200).json({
      status: 'success',
      chat: updatedChat,
    });
  } catch (error) {
    next(error);
  }
};

export const updateGroupDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { chatId, chatDescription, chatName } = req.body;
    if (!chatId) throw new BadRequestError('Chat ID is required');

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    const group = await Chat.findById(chatId);
    if (!group) throw new NotFoundError('Group not found');

    const isAdmin = group.admins.some((id) => id.toString() === currentUserId.toString());
    if (!isAdmin) {
      throw new ForbiddenError('Only admins can update group details');
    }

    if (chatName) group.chatName = chatName;
    if (chatDescription !== undefined) group.chatDescription = chatDescription;

    await group.save();

    const fullGroup = await Chat.findById(chatId)
      .populate('participants', 'fullName username email profilePhoto status lastSeen about')
      .populate('admins', 'fullName username email profilePhoto');

    res.status(200).json({
      status: 'success',
      chat: fullGroup,
    });
  } catch (error) {
    next(error);
  }
};

export const addToGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { chatId, userId } = req.body;
    if (!chatId || !userId) {
      throw new BadRequestError('Chat ID and User ID are required');
    }

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    const group = await Chat.findById(chatId);
    if (!group) throw new NotFoundError('Group not found');
    if (!group.isGroupChat) throw new BadRequestError('This is not a group chat');

    const isAdmin = group.admins.some((id) => id.toString() === currentUserId.toString());
    if (!isAdmin) {
      throw new ForbiddenError('Only admins can add members');
    }

    if (group.participants.some((id) => id.toString() === userId.toString())) {
      throw new BadRequestError('User is already in this group');
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { participants: userId } },
      { new: true }
    )
      .populate('participants', 'fullName username email profilePhoto status lastSeen about')
      .populate('admins', 'fullName username email profilePhoto');

    res.status(200).json({
      status: 'success',
      chat: updatedChat,
    });
  } catch (error) {
    next(error);
  }
};

export const removeFromGroup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { chatId, userId } = req.body;
    if (!chatId || !userId) {
      throw new BadRequestError('Chat ID and User ID are required');
    }

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    const group = await Chat.findById(chatId);
    if (!group) throw new NotFoundError('Group not found');
    if (!group.isGroupChat) throw new BadRequestError('This is not a group chat');

    const isAdmin = group.admins.some((id) => id.toString() === currentUserId.toString());
    const isSelf = currentUserId.toString() === userId.toString();

    // A member can remove themselves (leave), or an admin can remove any member
    if (!isAdmin && !isSelf) {
      throw new ForbiddenError('Only admins can remove members');
    }

    // Pull from participants & admins
    group.participants = group.participants.filter((id) => id.toString() !== userId.toString());
    group.admins = group.admins.filter((id) => id.toString() !== userId.toString());

    // If no participants left, we could delete group. For now, just save.
    if (group.participants.length > 0 && group.admins.length === 0) {
      // Auto-promote first remaining participant to admin
      group.admins.push(group.participants[0]);
    }

    await group.save();

    const fullGroup = await Chat.findById(chatId)
      .populate('participants', 'fullName username email profilePhoto status lastSeen about')
      .populate('admins', 'fullName username email profilePhoto');

    res.status(200).json({
      status: 'success',
      chat: fullGroup,
    });
  } catch (error) {
    next(error);
  }
};

export const promoteAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { chatId, userId } = req.body;
    if (!chatId || !userId) throw new BadRequestError('Chat ID and User ID are required');

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    const group = await Chat.findById(chatId);
    if (!group) throw new NotFoundError('Group not found');

    const isAdmin = group.admins.some((id) => id.toString() === currentUserId.toString());
    if (!isAdmin) {
      throw new ForbiddenError('Only admins can promote other members');
    }

    if (!group.participants.some((id) => id.toString() === userId.toString())) {
      throw new BadRequestError('User is not a participant of this group');
    }

    if (group.admins.some((id) => id.toString() === userId.toString())) {
      throw new BadRequestError('User is already an admin');
    }

    group.admins.push(userId);
    await group.save();

    const fullGroup = await Chat.findById(chatId)
      .populate('participants', 'fullName username email profilePhoto status lastSeen about')
      .populate('admins', 'fullName username email profilePhoto');

    res.status(200).json({
      status: 'success',
      chat: fullGroup,
    });
  } catch (error) {
    next(error);
  }
};

export const demoteAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { chatId, userId } = req.body;
    if (!chatId || !userId) throw new BadRequestError('Chat ID and User ID are required');

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    const group = await Chat.findById(chatId);
    if (!group) throw new NotFoundError('Group not found');

    const isAdmin = group.admins.some((id) => id.toString() === currentUserId.toString());
    if (!isAdmin) {
      throw new ForbiddenError('Only admins can demote other admins');
    }

    if (!group.admins.some((id) => id.toString() === userId.toString())) {
      throw new BadRequestError('User is not an admin');
    }

    if (group.admins.length === 1 && currentUserId.toString() === userId.toString()) {
      throw new BadRequestError('You are the only admin. You cannot demote yourself before promoting someone else.');
    }

    group.admins = group.admins.filter((id) => id.toString() !== userId.toString());
    await group.save();

    const fullGroup = await Chat.findById(chatId)
      .populate('participants', 'fullName username email profilePhoto status lastSeen about')
      .populate('admins', 'fullName username email profilePhoto');

    res.status(200).json({
      status: 'success',
      chat: fullGroup,
    });
  } catch (error) {
    next(error);
  }
};

export const joinGroupByLink = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { inviteCode } = req.params;
    if (!inviteCode) throw new BadRequestError('Invite code is required');

    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    const group = await Chat.findOne({ inviteCode });
    if (!group) {
      throw new NotFoundError('Invalid invite link or group not found');
    }

    // Check if blocked by any admin
    // In a real production system, you can check permissions. Here, we add participant.
    if (group.participants.some((id) => id.toString() === currentUserId.toString())) {
      res.status(200).json({
        status: 'success',
        message: 'You are already a member of this group',
        chat: group,
      });
      return;
    }

    group.participants.push(currentUserId);
    await group.save();

    const fullGroup = await Chat.findById(group._id)
      .populate('participants', 'fullName username email profilePhoto status lastSeen about')
      .populate('admins', 'fullName username email profilePhoto');

    res.status(200).json({
      status: 'success',
      message: 'Joined group successfully',
      chat: fullGroup,
    });
  } catch (error) {
    next(error);
  }
};

export const togglePinChat = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { chatId } = req.body;
    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) throw new NotFoundError('Chat not found');

    const isPinned = chat.pinnedBy.some((id) => id.toString() === currentUserId.toString());
    if (isPinned) {
      chat.pinnedBy = chat.pinnedBy.filter((id) => id.toString() !== currentUserId.toString());
    } else {
      chat.pinnedBy.push(currentUserId);
    }
    await chat.save();

    res.status(200).json({
      status: 'success',
      pinned: !isPinned,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleMuteChat = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { chatId } = req.body;
    if (!req.user) throw new BadRequestError('User context not found');
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) throw new NotFoundError('Chat not found');

    const isMuted = chat.mutedBy.some((id) => id.toString() === currentUserId.toString());
    if (isMuted) {
      chat.mutedBy = chat.mutedBy.filter((id) => id.toString() !== currentUserId.toString());
    } else {
      chat.mutedBy.push(currentUserId);
    }
    await chat.save();

    res.status(200).json({
      status: 'success',
      muted: !isMuted,
    });
  } catch (error) {
    next(error);
  }
};
