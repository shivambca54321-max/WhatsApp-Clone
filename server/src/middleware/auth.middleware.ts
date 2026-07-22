import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import User from '../models/User';
import { UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token is missing');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Access token is invalid');
    }

    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      req.user = user;
      next();
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token has expired');
      }
      throw new UnauthorizedError('Access token is invalid');
    }
  } catch (error) {
    next(error);
  }
};
