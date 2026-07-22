import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Something went wrong';
  let errors: any = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values((err as any).errors).map((e: any) => e.message);
  } else if (err.name === 'CastError') {
    // Mongoose bad Object ID
    statusCode = 400;
    message = `Invalid ${(err as any).path}: ${(err as any).value}`;
  }

  // Log error
  if (statusCode >= 500) {
    logger.error('Unhandled Error: %O\nRoute: %s %s', err, req.method, req.originalUrl);
  } else {
    logger.warn('Client Error (%d): %s\nRoute: %s %s', statusCode, err.message, req.method, req.originalUrl);
  }

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
