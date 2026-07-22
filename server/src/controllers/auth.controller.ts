import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Session from '../models/Session';
import { 
  BadRequestError, 
  ConflictError, 
  NotFoundError, 
  UnauthorizedError 
} from '../utils/errors';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} from '../utils/jwt';
import { 
  sendVerificationOTPEmail, 
  sendPasswordResetOTPEmail 
} from '../services/email.service';
import logger from '../utils/logger';

// Helper to generate a 6-digit numeric OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, username, email, password, phone } = req.body;

    // Check if user already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      throw new ConflictError('Email is already registered');
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      throw new ConflictError('Username is already taken');
    }

    // Generate Verification OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create User
    const user = new User({
      fullName,
      username,
      email,
      password,
      phone,
      verificationOTP: otp,
      verificationOTPExpires: otpExpires,
    });

    await user.save();
    
    // Send email
    await sendVerificationOTPEmail(email, otp);

    res.status(201).json({
      status: 'success',
      message: 'Registration successful. Verification OTP sent to your email.',
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestError('Email is already verified');
    }

    // Verify OTP
    if (
      !user.verificationOTP || 
      !user.verificationOTPExpires || 
      user.verificationOTP !== otp || 
      user.verificationOTPExpires.getTime() < Date.now()
    ) {
      throw new BadRequestError('Invalid or expired OTP');
    }

    // Mark as verified
    user.isVerified = true;
    user.verificationOTP = undefined;
    user.verificationOTPExpires = undefined;
    user.status = 'online';
    await user.save();

    // Create Session and tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const session = new Session({
      user: user._id,
      refreshToken,
      deviceType: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || '',
      expiresAt,
    });

    await session.save();

    // Set Refresh Token in Secure Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully. You are now logged in.',
      accessToken,
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
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if verified
    if (!user.isVerified) {
      // Re-send verification OTP
      const otp = generateOTP();
      user.verificationOTP = otp;
      user.verificationOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      await sendVerificationOTPEmail(user.email, otp);

      res.status(403).json({
        status: 'unverified',
        message: 'Please verify your email. A new verification OTP has been sent.',
        email: user.email,
      });
      return;
    }

    user.status = 'online';
    await user.save();

    // Create session and tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const session = new Session({
      user: user._id,
      refreshToken,
      deviceType: req.headers['user-agent'] || 'Unknown',
      ipAddress: req.ip || '',
      expiresAt,
    });

    await session.save();

    // Set Refresh Token Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      accessToken,
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
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      // Find user before deleting session
      try {
        const decoded = verifyRefreshToken(refreshToken);
        await User.findByIdAndUpdate(decoded.userId, { status: 'offline', lastSeen: new Date() });
      } catch (e) {
        // Suppress invalid token error for logout
      }
      
      // Delete session
      await Session.findOneAndDelete({ refreshToken });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
      throw new UnauthorizedError('Refresh token is missing');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(oldRefreshToken);
    } catch (err) {
      throw new UnauthorizedError('Refresh token is invalid or expired');
    }

    // Find active session
    const session = await Session.findOne({ refreshToken: oldRefreshToken });
    if (!session) {
      throw new UnauthorizedError('Session not found or revoked');
    }

    // Generate new tokens
    const accessToken = generateAccessToken(session.user);
    const newRefreshToken = generateRefreshToken(session.user);

    // Update session (Refresh Token Rotation)
    session.refreshToken = newRefreshToken;
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Reset expiry to 7 days
    await session.save();

    // Set cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      status: 'success',
      accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Return success to prevent user enumeration
      res.status(200).json({
        status: 'success',
        message: 'If the email exists, a password reset code has been sent.',
      });
      return;
    }

    // Generate Reset OTP
    const otp = generateOTP();
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendPasswordResetOTPEmail(email, otp);

    res.status(200).json({
      status: 'success',
      message: 'If the email exists, a password reset code has been sent.',
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (
      !user.resetPasswordOTP ||
      !user.resetPasswordOTPExpires ||
      user.resetPasswordOTP !== otp ||
      user.resetPasswordOTPExpires.getTime() < Date.now()
    ) {
      throw new BadRequestError('Invalid or expired password reset OTP');
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();

    // Revoke all sessions for this user for security
    await Session.deleteMany({ user: user._id });

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful. Please login with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    
    // Set online status in case it was missed
    if (req.user.status === 'offline') {
      req.user.status = 'online';
      await req.user.save();
    }

    res.status(200).json({
      status: 'success',
      user: {
        id: req.user._id,
        fullName: req.user.fullName,
        username: req.user.username,
        email: req.user.email,
        phone: req.user.phone,
        profilePhoto: req.user.profilePhoto,
        coverPhoto: req.user.coverPhoto,
        bio: req.user.bio,
        about: req.user.about,
        status: req.user.status,
        themePreference: req.user.themePreference,
        accentColor: req.user.accentColor,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
