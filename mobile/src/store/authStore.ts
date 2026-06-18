import { create } from 'zustand';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  signIn: (tokens: Tokens) => void;
  signOut: () => void;
  clear: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  signIn: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
  signOut: () => set({ accessToken: null, refreshToken: null }),
  clear: () => set({ accessToken: null, refreshToken: null }),
  isAuthenticated: () => get().accessToken !== null,
}));
