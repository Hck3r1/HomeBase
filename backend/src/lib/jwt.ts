import jwt, { type SignOptions } from 'jsonwebtoken';
import { parseEnv } from '../config/env';

const env = parseEnv(process.env);

export interface AccessClaims {
  sub: string;
  role: 'seeker' | 'lister';
}

export function signAccessToken(claims: AccessClaims): string {
  const options: SignOptions = { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'] };
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(sub: string): string {
  const options: SignOptions = { expiresIn: env.REFRESH_TOKEN_TTL as SignOptions['expiresIn'] };
  return jwt.sign({ sub }, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): AccessClaims {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessClaims;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
}
