const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => void (store[k] = v)),
  getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
  deleteItemAsync: jest.fn(async (k: string) => void delete store[k]),
}));

import { useAuthStore } from '../src/store/authStore';

describe('authStore setTokens', () => {
  beforeEach(async () => {
    Object.keys(store).forEach((k) => delete store[k]);
    await useAuthStore.getState().signOut();
  });

  it('persists rotated tokens without replacing the user', async () => {
    await useAuthStore.getState().signIn({
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      user: {
        id: '1',
        name: 'A',
        email: 'a@x.com',
        role: 'seeker',
        listerType: null,
      },
    });

    await useAuthStore.getState().setTokens('new-access', 'new-refresh');

    expect(useAuthStore.getState().accessToken).toBe('new-access');
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh');
    expect(useAuthStore.getState().user?.email).toBe('a@x.com');
    expect(store.hb_access).toBe('new-access');
    expect(store.hb_refresh).toBe('new-refresh');
  });
});
