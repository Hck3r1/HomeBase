import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../middleware/error';
import {
  verifyEmailErrorPage,
  verifyEmailMissingTokenPage,
  verifyEmailSuccessPage,
} from '../../lib/auth-pages';
import * as service from './auth.service';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json(await service.register(req.body.name, req.body.email, req.body.password));
  } catch (e) {
    next(e);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.login(req.body.email, req.body.password));
  } catch (e) {
    next(e);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.refresh(req.body.refreshToken));
  } catch (e) {
    next(e);
  }
}

export async function logout(_req: Request, res: Response) {
  res.status(204).send();
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.forgotPassword(req.body.email));
  } catch (e) {
    next(e);
  }
}

export async function verifyResetOtp(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.verifyResetOtp(req.body.email, req.body.otp));
  } catch (e) {
    next(e);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.resetPassword(req.body.token, req.body.password));
  } catch (e) {
    next(e);
  }
}

export async function social(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.socialLogin(req.body.provider, req.body.token));
  } catch (e) {
    next(e);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await service.verifyEmail(req.body.token));
  } catch (e) {
    next(e);
  }
}

export async function verifyEmailLink(req: Request, res: Response, next: NextFunction) {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) {
      res.status(400).type('html').send(verifyEmailMissingTokenPage());
      return;
    }
    await service.verifyEmail(token);
    res.status(200).type('html').send(verifyEmailSuccessPage());
  } catch (e) {
    if (e instanceof ApiError) {
      res.status(e.status).type('html').send(verifyEmailErrorPage(e.message));
      return;
    }
    next(e);
  }
}
