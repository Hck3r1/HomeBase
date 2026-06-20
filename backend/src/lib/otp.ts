import crypto from 'crypto';

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60_000;

export function generateOtp(): string {
  return String(crypto.randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH));
}

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export function verifyOtp(otp: string, hash: string | null | undefined): boolean {
  if (!hash) return false;
  return hashOtp(otp) === hash;
}

export function otpExpiresAt(): Date {
  return new Date(Date.now() + OTP_TTL_MS);
}
