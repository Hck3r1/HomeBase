import { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError } from './error';

/**
 * Requires a verified KycVerification record for the authenticated user.
 *
 * Not wired to routes yet — enable with Dojah (Phase 6). When live, apply to:
 * - POST/PATCH listing routes (agents/landlords cannot list without verified KYC)
 * - Payout setup routes
 */
export async function requireKyc(req: Request, _res: Response, next: NextFunction) {
  try {
    const kyc = await prisma.kycVerification.findUnique({ where: { userId: req.user!.id } });
    if (kyc?.status !== 'verified') {
      return next(new ApiError(403, 'Identity verification required'));
    }
    next();
  } catch (e) {
    next(e);
  }
}
