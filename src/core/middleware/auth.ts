import { Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import redis from '../../config/redis';
import { UnauthorizedError, ForbiddenError } from '../../core/errors/AppError';
import { AuthRequest } from '../../shared/types';

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const sessionId = req.headers['x-session-id'] as string;

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const payload = verify(token, process.env.JWT_SECRET!) as any;

    if (sessionId) {
      const sessionExists = await redis.exists(`session:${sessionId}`);
      if (!sessionExists) {
        throw new UnauthorizedError('Session expired or revoked');
      }
    }

    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};