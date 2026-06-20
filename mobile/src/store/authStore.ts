import { create } from 'zustand';
import { onboardingStorage } from '../lib/onboardingStorage';
import { bareApi } from '../lib/bareApi';
import {
  clearStoredTokens,
  clearStoredUser,
  configureAuthSession,
  getAccessToken,
  loadStoredTokens,
  loadStoredUser,
  persistTokens,
  saveStoredUser,
} from '../lib/authSession';
import { getApiBaseUrl } from '../lib/apiConfig';

export type ListingInterest = 'rent' | 'sale' | 'shortstay';
export type Gender = 'male' | 'female' | 'prefer_not_to_say';
export type SetupStep = 'profile' | 'role' | 'preferences' | 'kyc';

export interface UserPreferences {
  listingTypes: ListingInterest[];
  budgetMin: number | null;
  budgetMax: number | null;
  preferredCity: string | null;
  bedroomsMin: number | null;
  serviceAreas: string[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'seeker' | 'lister';
  listerType: 'agent' | 'landlord' | null;
  phone?: string | null;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  setupStep?: SetupStep;
  setupCompletedAt?: string | null;
  preferences?: UserPreferences | null;
}

interface SignInPayload {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  splashFinished: boolean;
  showOnboarding: boolean;
  signIn: (p: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (u: AuthUser) => void;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  hydrate: () => Promise<void>;
  finishSplash: () => void;
  isAuthenticated: () => boolean;
  needsSetup: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  splashFinished: false,
  showOnboarding: true,
  signIn: async ({ accessToken, refreshToken, user }) => {
    if (!(await onboardingStorage.hasLoggedInBefore())) {
      await onboardingStorage.markLoggedInBefore();
    }
    await onboardingStorage.clearShowAfterLogout();
    set({ accessToken, refreshToken, user, showOnboarding: false, splashFinished: true });
    await persistTokens(accessToken, refreshToken);
    await saveStoredUser(JSON.stringify(user));
    await get().refreshUser();
  },
  signOut: async () => {
    const accessToken = get().accessToken;
    if (accessToken) {
      try {
        await fetch(`${getApiBaseUrl()}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch {
        // Best-effort; local session is always cleared.
      }
    }
    await onboardingStorage.setShowAfterLogout();
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      showOnboarding: true,
      splashFinished: true,
    });
    await clearStoredTokens();
    await clearStoredUser();
  },
  setUser: (user) => {
    set({ user });
    void saveStoredUser(JSON.stringify(user));
  },
  setTokens: async (accessToken, refreshToken) => {
    await persistTokens(accessToken, refreshToken);
  },
  refreshUser: async () => {
    const accessToken = get().accessToken;
    if (!accessToken) return;
    try {
      const { data } = await bareApi.get<AuthUser>('/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      set({ user: data });
      await saveStoredUser(JSON.stringify(data));
    } catch {
      // Keep cached profile when offline or during tests without API mocks.
    }
  },
  hydrate: async () => {
    const { accessToken, refreshToken } = await loadStoredTokens();
    const rawUser = await loadStoredUser();
    const isAuthenticated = accessToken !== null;
    const showOnboarding = isAuthenticated ? false : await onboardingStorage.shouldShowForGuest();
    set({
      accessToken,
      refreshToken,
      user: rawUser ? (JSON.parse(rawUser) as AuthUser) : null,
      showOnboarding,
    });
    if (isAuthenticated) {
      await get().refreshUser();
    }
    set({ hydrated: true, splashFinished: isAuthenticated ? true : get().splashFinished });
  },
  finishSplash: () => set({ splashFinished: true }),
  isAuthenticated: () => get().accessToken !== null,
  needsSetup: () => {
    const { accessToken, user } = get();
    if (!accessToken) return false;
    return user?.setupCompletedAt == null;
  },
}));

configureAuthSession({
  onTokensUpdated: (accessToken, refreshToken) => {
    useAuthStore.setState({ accessToken, refreshToken });
  },
  onSessionExpired: () => useAuthStore.getState().signOut(),
});
