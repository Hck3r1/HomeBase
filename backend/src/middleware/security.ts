import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { NextFunction, Request, Response } from 'express';

export const security = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  }),
  cors({ origin: true, credentials: true }),
];

export const generalLimiter =
  process.env.NODE_ENV === 'test'
    ? (_req: Request, _res: Response, next: NextFunction) => next()
    : rateLimit({ windowMs: 60_000, max: 120 });

export const authLimiter =
  process.env.NODE_ENV === 'test'
    ? (_req: Request, _res: Response, next: NextFunction) => next()
    : rateLimit({ windowMs: 60_000, max: 10 });
