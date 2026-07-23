import { Router } from 'express';
import { 
  register, 
  resendOTP,
  verifyEmail, 
  login, 
  sendLoginOTP,
  logout, 
  refresh, 
  forgotPassword, 
  resetPassword,
  getMe
} from '../controllers/auth.controller';
import { 
  registerSchema, 
  loginSchema, 
  sendLoginOTPSchema,
  forgotPasswordSchema, 
  resetPasswordSchema,
  verifyEmailSchema
} from '../validators/auth.validator';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Apply auth rate limiter for login, register, and reset flows
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/resend-otp', authLimiter, resendOTP);
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), verifyEmail);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/send-login-otp', authLimiter, validate(sendLoginOTPSchema), sendLoginOTP);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);

// Get current logged-in user profile
router.get('/me', authenticate, getMe);

export default router;
