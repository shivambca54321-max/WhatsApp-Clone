import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export interface TokenPayload {
  userId: string;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'default_access_secret_123';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret_456';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

export const generateAccessToken = (userId: string | mongoose.Types.ObjectId): string => {
  return jwt.sign({ userId: userId.toString() }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRY as any,
  });
};

export const generateRefreshToken = (userId: string | mongoose.Types.ObjectId): string => {
  return jwt.sign({ userId: userId.toString() }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRY as any,
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
};
