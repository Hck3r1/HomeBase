import { api } from './api';
import type { AuthUser } from '../store/authStore';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterResponse {
  ok: true;
  message: string;
}

export async function register(name: string, email: string, password: string): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>('/auth/register', { name, email, password });
  return data;
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const { data } = await api.post<AuthSession>('/auth/login', { email, password });
  return data;
}

export async function forgotPassword(email: string): Promise<{ ok: true }> {
  const { data } = await api.post<{ ok: true }>('/auth/forgot-password', { email });
  return data;
}

export async function verifyResetOtp(email: string, otp: string): Promise<{ ok: true; resetToken: string }> {
  const { data } = await api.post<{ ok: true; resetToken: string }>('/auth/verify-reset-otp', { email, otp });
  return data;
}

export async function resetPassword(token: string, password: string): Promise<{ ok: true }> {
  const { data } = await api.post<{ ok: true }>('/auth/reset-password', { token, password });
  return data;
}

export async function refreshSession(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const { data } = await api.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
    refreshToken,
  });
  return data;
}

export async function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<{ ok: true }> {
  const { data } = await api.post<{ ok: true }>('/me/push-token', { token, platform });
  return data;
}
