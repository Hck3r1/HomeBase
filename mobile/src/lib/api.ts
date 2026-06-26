import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  expireSession,
  getAccessToken,
  getRefreshToken,
  persistTokens,
} from './authSession';
import { bareApi } from './bareApi';
import { getApiBaseUrl } from './apiConfig';

export { bareApi } from './bareApi';

export const api = axios.create({
  timeout: 15000,
});

const SKIP_REFRESH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/verify-reset-otp',
  '/auth/reset-password',
];

export function shouldAttemptTokenRefresh(url: string | undefined, status: number | undefined): boolean {
  if (status !== 401 || !url) return false;
  return !SKIP_REFRESH_PATHS.some((path) => url.includes(path));
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    await expireSession();
    return null;
  }

  try {
    const { data } = await bareApi.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      refreshToken,
    });
    await persistTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    await expireSession();
    return null;
  }
}

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!config || config._retry || !shouldAttemptTokenRefresh(config.url, error.response?.status)) {
      return Promise.reject(error);
    }

    config._retry = true;

    if (!refreshInFlight) {
      refreshInFlight = refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
    }

    const accessToken = await refreshInFlight;
    if (!accessToken) {
      return Promise.reject(error);
    }

    config.headers.Authorization = `Bearer ${accessToken}`;
    return api(config);
  },
);
