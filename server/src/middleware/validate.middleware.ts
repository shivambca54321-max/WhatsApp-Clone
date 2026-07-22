import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { BadRequestError } from '../utils/errors';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate req.body, query, and params
      const parsed = await schema.parseAsync(req.body);
      // Replace body with parsed and validated body (strips unknown fields)
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
        res.status(400).json({
          status: 'error',
          message: 'Validation Error',
          errors: errorMessages,
        });
        return;
      }
      next(error);
    }
  };
};
