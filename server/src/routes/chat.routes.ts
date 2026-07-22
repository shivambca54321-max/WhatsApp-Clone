import { Router } from 'express';
import {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  updateGroupDetails,
  addToGroup,
  removeFromGroup,
  promoteAdmin,
  demoteAdmin,
  joinGroupByLink,
  togglePinChat,
  toggleMuteChat
} from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Base chats APIs
router.post('/', authenticate, accessChat);
router.get('/', authenticate, fetchChats);

// Group management APIs
router.post('/group', authenticate, createGroupChat);
router.patch('/group/rename', authenticate, renameGroup);
router.patch('/group/details', authenticate, updateGroupDetails);
router.patch('/group/add', authenticate, addToGroup);
router.patch('/group/remove', authenticate, removeFromGroup);
router.patch('/group/promote', authenticate, promoteAdmin);
router.patch('/group/demote', authenticate, demoteAdmin);
router.get('/group/join/:inviteCode', authenticate, joinGroupByLink);

// Preferences actions
router.post('/pin', authenticate, togglePinChat);
router.post('/mute', authenticate, toggleMuteChat);

export default router;
