import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { hashPassword, verifyPassword } from '../../lib/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { ApiError } from '../../middleware/error';
import { verifyProviderToken } from './social';
import { sendVerificationEmail, sendPasswordResetOtpEmail, sendPasswordChangedEmail } from '../../lib/mail';
import { generateOtp, hashOtp, verifyOtp, otpExpiresAt } from '../../lib/otp';

import { publicUser } from '../../lib/userPublic';

function tokens(id: string, role: 'seeker' | 'lister') {
  return { accessToken: signAccessToken({ sub: id, role }), refreshToken: signRefreshToken(id) };
}

export async function register(name: string, email: string, password: string) {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new ApiError(409, 'Email already registered');
  const verifyToken = crypto.randomBytes(24).toString('hex');
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      emailVerifyToken: verifyToken,
      emailVerifyTokenExp: new Date(Date.now() + 24 * 3600_000),
    },
  });
  try {
    await sendVerificationEmail(user.email, user.name, verifyToken);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('Verification email failed:', detail);
    await prisma.user.delete({ where: { id: user.id } });
    throw new ApiError(503, 'Could not send verification email. Check mail configuration and try again.');
  }
  return {
    ok: true as const,
    message: 'Check your email to verify your account before signing in.',
  };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email }, include: { preferences: true } });
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid credentials');
  }
  if (!user.emailVerifiedAt) {
    throw new ApiError(403, 'Please verify your email to continue');
  }
  return { user: publicUser(user), ...tokens(user.id, user.role) };
}

export async function refresh(refreshToken: string) {
  let sub: string;
  try {
    sub = verifyRefreshToken(refreshToken).sub;
  } catch {
    throw new ApiError(401, 'Invalid refresh token');
  }
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user) throw new ApiError(401, 'Invalid refresh token');
  return tokens(user.id, user.role);
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ApiError(404, 'No account found with this email');
  if (!user.passwordHash) throw new ApiError(400, 'This account uses social login. Sign in with Google or Facebook instead.');
  const otp = generateOtp();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetOtpHash: hashOtp(otp),
      resetOtpExp: otpExpiresAt(),
      resetToken: null,
      resetTokenExp: null,
    },
  });
  try {
    await sendPasswordResetOtpEmail(user.email, user.name, otp);
  } catch {
    throw new ApiError(503, 'Could not send reset code. Try again later.');
  }
  return { ok: true as const };
}

export async function verifyResetOtp(email: string, otp: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.resetOtpHash || !user.resetOtpExp || user.resetOtpExp <= new Date()) {
    throw new ApiError(400, 'Invalid or expired code');
  }
  if (!verifyOtp(otp, user.resetOtpHash)) {
    throw new ApiError(400, 'Invalid or expired code');
  }
  const resetToken = crypto.randomBytes(24).toString('hex');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExp: new Date(Date.now() + 15 * 60_000),
      resetOtpHash: null,
      resetOtpExp: null,
    },
  });
  return { ok: true as const, resetToken };
}

export async function resetPassword(token: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExp: { gt: new Date() } },
  });
  if (!user) throw new ApiError(400, 'Invalid or expired reset session. Request a new code.');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      resetToken: null,
      resetTokenExp: null,
      resetOtpHash: null,
      resetOtpExp: null,
    },
  });
  try {
    await sendPasswordChangedEmail(user.email, user.name);
  } catch {
    // Password already updated; don't fail the request if notification email fails.
  }
  return { ok: true as const };
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({
    where: { emailVerifyToken: token, emailVerifyTokenExp: { gt: new Date() } },
  });
  if (!user) throw new ApiError(400, 'Invalid or expired verification link');
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date(), emailVerifyToken: null, emailVerifyTokenExp: null },
  });
  return { ok: true as const, message: 'Email verified successfully. You can now sign in.' };
}

export async function socialLogin(provider: string, token: string) {
  const profile = await verifyProviderToken(provider, token);
  let user = await prisma.user.findUnique({ where: { email: profile.email }, include: { preferences: true } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        emailVerifiedAt: new Date(),
        authProviders: { create: { provider: profile.provider, providerUid: profile.providerUid } },
      },
      include: { preferences: true },
    });
  }
  return { user: publicUser(user), ...tokens(user.id, user.role) };
}
