import { secureStorage } from './secureStorage';

export const AUTH_STORAGE_KEYS = {
  access: 'hb_access',
  refresh: 'hb_refresh',
  user: 'hb_user',
} as const;

type SessionHandlers = {
  onTokensUpdated?: (accessToken: string, refreshToken: string) => void;
  onSessionExpired?: () => void | Promise<void>;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;
let handlers: SessionHandlers = {};

export function configureAuthSession(next: SessionHandlers) {
  handlers = { ...handlers, ...next };
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export async function persistTokens(nextAccess: string, nextRefresh: string) {
  accessToken = nextAccess;
  refreshToken = nextRefresh;
  await Promise.all([
    secureStorage.set(AUTH_STORAGE_KEYS.access, nextAccess),
    secureStorage.set(AUTH_STORAGE_KEYS.refresh, nextRefresh),
  ]);
  handlers.onTokensUpdated?.(nextAccess, nextRefresh);
}

export async function loadStoredTokens() {
  const [storedAccess, storedRefresh] = await Promise.all([
    secureStorage.get(AUTH_STORAGE_KEYS.access),
    secureStorage.get(AUTH_STORAGE_KEYS.refresh),
  ]);
  accessToken = storedAccess;
  refreshToken = storedRefresh;
  return { accessToken: storedAccess, refreshToken: storedRefresh };
}

export async function clearStoredTokens() {
  accessToken = null;
  refreshToken = null;
  await Promise.all([
    secureStorage.remove(AUTH_STORAGE_KEYS.access),
    secureStorage.remove(AUTH_STORAGE_KEYS.refresh),
  ]);
}

export async function expireSession() {
  await handlers.onSessionExpired?.();
}

export async function saveStoredUser(raw: string) {
  await secureStorage.set(AUTH_STORAGE_KEYS.user, raw);
}

export async function loadStoredUser() {
  return secureStorage.get(AUTH_STORAGE_KEYS.user);
}

export async function clearStoredUser() {
  await secureStorage.remove(AUTH_STORAGE_KEYS.user);
}
