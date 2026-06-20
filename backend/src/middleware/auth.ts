import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { ApiError } from './error';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: 'seeker' | 'lister' };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new ApiError(401, 'Missing token'));
  try {
    const claims = verifyAccessToken(header.slice(7));
    req.user = { id: claims.sub, role: claims.role };
    next();
  } catch {
    next(new ApiError(401, 'Invalid token'));
  }
}

export function requireLister(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'lister') return next(new ApiError(403, 'Lister role required'));
  next();
}
