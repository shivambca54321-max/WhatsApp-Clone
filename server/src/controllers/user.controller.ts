import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Chat from '../models/Chat';
import Message from '../models/Message';
import Session from '../models/Session';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { uploadFile } from '../services/storage.service';
import mongoose from 'mongoose';

export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username: username.toLowerCase() });
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json({
      status: 'success',
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        profilePhoto: user.profilePhoto,
        coverPhoto: user.coverPhoto,
        bio: user.bio,
        about: user.about,
        status: user.status,
        lastSeen: user.lastSeen,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new BadRequestError('User context not found');

    const { fullName, bio, about, themePreference, accentColor, chatWallpaper } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError('User not found');

    if (fullName) user.fullName = fullName;
    if (bio !== undefined) user.bio = bio;
    if (about !== undefined) user.about = about;
    if (themePreference) user.themePreference = themePreference;
    if (accentColor) user.accentColor = accentColor;
    if (chatWallpaper !== undefined) user.chatWallpaper = chatWallpaper;

    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        profilePhoto: user.profilePhoto,
        coverPhoto: user.coverPhoto,
        bio: user.bio,
        about: user.about,
        status: user.status,
        themePreference: user.themePreference,
        accentColor: user.accentColor,
        chatWallpaper: user.chatWallpaper,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new BadRequestError('User context not found');
    if (!req.file) throw new BadRequestError('Please upload an image file');

    const fileUrl = await uploadFile(req.file);

    await User.findByIdAndUpdate(req.user._id, { profilePhoto: fileUrl });

    res.status(200).json({
      status: 'success',
      message: 'Profile photo updated successfully',
      profilePhoto: fileUrl,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadCover = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new BadRequestError('User context not found');
    if (!req.file) throw new BadRequestError('Please upload an image file');

    const fileUrl = await uploadFile(req.file);

    await User.findByIdAndUpdate(req.user._id, { coverPhoto: fileUrl });

    res.status(200).json({
      status: 'success',
      message: 'Cover photo updated successfully',
      coverPhoto: fileUrl,
    });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      res.status(200).json({ status: 'success', users: [] });
      return;
    }

    const currentUserId = req.user?._id;

    // Search users excluding current user
    const users = await User.find({
      $and: [
        {
          $or: [
            { fullName: { $regex: query, $options: 'i' } },
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
          ],
        },
        { _id: { $ne: currentUserId } },
      ],
    }).limit(20);

    const formattedUsers = users.map((u) => ({
      id: u._id,
      fullName: u.fullName,
      username: u.username,
      profilePhoto: u.profilePhoto,
      about: u.about,
      status: u.status,
    }));

    res.status(200).json({
      status: 'success',
      users: formattedUsers,
    });
  } catch (error) {
    next(error);
  }
};

export const addContact = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new BadRequestError('User context not found');
    const { contactId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      throw new BadRequestError('Invalid Contact ID');
    }

    if (req.user._id.toString() === contactId.toString()) {
      throw new BadRequestError('You cannot add yourself to contacts');
    }

    const userToContact = await User.findById(contactId);
    if (!userToContact) {
      throw new NotFoundError('Contact user not found');
    }

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError('User not found');

    if (user.contacts.includes(contactId)) {
      throw new BadRequestError('User is already in your contacts');
    }

    user.contacts.push(contactId);
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Contact added successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const removeContact = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new BadRequestError('User context not found');
    const { contactId } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError('User not found');

    user.contacts = user.contacts.filter((id) => id.toString() !== contactId.toString());
    user.favorites = user.favorites.filter((id) => id.toString() !== contactId.toString());
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Contact removed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleFavoriteContact = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new BadRequestError('User context not found');
    const { contactId } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError('User not found');

    const isFav = user.favorites.includes(contactId);
    if (isFav) {
      user.favorites = user.favorites.filter((id) => id.toString() !== contactId.toString());
    } else {
      user.favorites.push(contactId);
    }
    await user.save();

    res.status(200).json({
      status: 'success',
      message: isFav ? 'Removed from favorites' : 'Added to favorites',
      isFavorite: !isFav,
    });
  } catch (error) {
    next(error);
  }
};

export const blockUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new BadRequestError('User context not found');
    const { userId } = req.body;

    if (req.user._id.toString() === userId.toString()) {
      throw new BadRequestError('You cannot block yourself');
    }

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError('User not found');

    if (user.blockedUsers.includes(userId)) {
      throw new BadRequestError('User is already blocked');
    }

    user.blockedUsers.push(userId);
    // Remove from contacts if blocked
    user.contacts = user.contacts.filter((id) => id.toString() !== userId.toString());
    user.favorites = user.favorites.filter((id) => id.toString() !== userId.toString());
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'User blocked successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const unblockUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new BadRequestError('User context not found');
    const { userId } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError('User not found');

    user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== userId.toString());
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'User unblocked successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getContacts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new BadRequestError('User context not found');

    const user = await User.findById(req.user._id)
      .populate('contacts', 'fullName username email profilePhoto about status lastSeen')
      .populate('blockedUsers', 'fullName username email profilePhoto status');

    if (!user) throw new NotFoundError('User not found');

    res.status(200).json({
      status: 'success',
      contacts: user.contacts,
      favorites: user.favorites,
      blockedUsers: user.blockedUsers,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new BadRequestError('User context not found');
    const userId = req.user._id;

    // Delete user
    await User.findByIdAndDelete(userId);
    // Delete user sessions
    await Session.deleteMany({ user: userId });
    // Remove references in contacts
    await User.updateMany(
      { contacts: userId },
      { $pull: { contacts: userId, favorites: userId } }
    );
    // Remove references in chats participants list
    // Note: for 1-to-1 chats, we can delete them, or leave them. For now, let's pull user out of chat participants.
    await Chat.updateMany(
      { participants: userId },
      { $pull: { participants: userId, admins: userId } }
    );

    res.clearCookie('refreshToken');
    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const exportAccountData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) throw new BadRequestError('User context not found');
    const userId = req.user._id;

    const user = await User.findById(userId);
    const messages = await Message.find({ sender: userId });
    const chats = await Chat.find({ participants: userId });

    const exportData = {
      profile: {
        fullName: user?.fullName,
        username: user?.username,
        email: user?.email,
        phone: user?.phone,
        bio: user?.bio,
        about: user?.about,
        createdAt: user?.createdAt,
      },
      contactsCount: user?.contacts.length,
      chatsCount: chats.length,
      messagesSentCount: messages.length,
      exportedAt: new Date(),
    };

    res.setHeader('Content-disposition', `attachment; filename=velo-export-${user?.username}.json`);
    res.setHeader('Content-type', 'application/json');
    res.write(JSON.stringify(exportData, null, 2));
    res.end();
  } catch (error) {
    next(error);
  }
};
