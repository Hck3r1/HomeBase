import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export const loginSchema = z.object({
  body: z.object({ email: z.string().email(), password: z.string().min(1) }),
});

export const refreshSchema = z.object({ body: z.object({ refreshToken: z.string().min(10) }) });

export const forgotSchema = z.object({ body: z.object({ email: z.string().email() }) });

export const resetSchema = z.object({
  body: z.object({ token: z.string().min(10), password: z.string().min(8) }),
});

export const verifyResetOtpSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  }),
});

export const socialSchema = z.object({
  body: z.object({ provider: z.enum(['google', 'facebook', 'x']), token: z.string().min(10) }),
});

export const verifyEmailSchema = z.object({
  body: z.object({ token: z.string().min(10) }),
});
