import { Router } from 'express';
import {
  sendMessage,
  fetchMessages,
  editMessage,
  deleteMessage,
  reactToMessage,
  voteInPoll
} from '../controllers/message.controller';
import { authenticate } from '../middleware/auth.middleware';
import upload from '../config/multer';

const router = Router();

// Message Core Endpoints
router.post('/', authenticate, upload.single('file'), sendMessage);
router.get('/:chatId', authenticate, fetchMessages);
router.patch('/', authenticate, editMessage);

// Interactions
router.post('/delete', authenticate, deleteMessage);
router.post('/react', authenticate, reactToMessage);
router.post('/poll/vote', authenticate, voteInPoll);

export default router;
