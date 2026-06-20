import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/security';
import {
  forgotSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetSchema,
  socialSchema,
  verifyEmailSchema,
  verifyResetOtpSchema,
} from './auth.schemas';
import * as controller from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate(registerSchema), controller.register);
authRouter.post('/login', authLimiter, validate(loginSchema), controller.login);
authRouter.post('/refresh', validate(refreshSchema), controller.refresh);
authRouter.post('/logout', controller.logout);
authRouter.post('/forgot-password', authLimiter, validate(forgotSchema), controller.forgotPassword);
authRouter.post('/verify-reset-otp', authLimiter, validate(verifyResetOtpSchema), controller.verifyResetOtp);
authRouter.post('/reset-password', authLimiter, validate(resetSchema), controller.resetPassword);
authRouter.post('/verify-email', validate(verifyEmailSchema), controller.verifyEmail);
authRouter.get('/verify-email', controller.verifyEmailLink);
authRouter.post('/social', authLimiter, validate(socialSchema), controller.social);
