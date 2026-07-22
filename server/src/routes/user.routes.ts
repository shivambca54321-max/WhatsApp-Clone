import { Router } from 'express';
import { 
  getProfile, 
  updateProfile, 
  uploadAvatar, 
  uploadCover, 
  searchUsers,
  getContacts,
  addContact,
  removeContact,
  toggleFavoriteContact,
  blockUser,
  unblockUser,
  deleteAccount,
  exportAccountData
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import upload from '../config/multer';

const router = Router();

// User Profile Actions (Require authentication)
router.get('/profile/:username', authenticate, getProfile);
router.patch('/profile', authenticate, updateProfile);
router.post('/profile/avatar', authenticate, upload.single('avatar'), uploadAvatar);
router.post('/profile/cover', authenticate, upload.single('cover'), uploadCover);

// Search Users
router.get('/search', authenticate, searchUsers);

// Contacts management
router.get('/contacts', authenticate, getContacts);
router.post('/contacts', authenticate, addContact);
router.delete('/contacts', authenticate, removeContact);
router.post('/contacts/favorite', authenticate, toggleFavoriteContact);
router.post('/contacts/block', authenticate, blockUser);
router.post('/contacts/unblock', authenticate, unblockUser);

// Account Actions
router.delete('/account', authenticate, deleteAccount);
router.get('/account/export', authenticate, exportAccountData);

export default router;
