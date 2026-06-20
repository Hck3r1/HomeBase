const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => void (store[k] = v)),
  getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
  deleteItemAsync: jest.fn(async (k: string) => void delete store[k]),
}));

import { useAuthStore } from '../src/store/authStore';

describe('authStore persistence', () => {
  beforeEach(async () => {
    Object.keys(store).forEach((k) => delete store[k]);
    await useAuthStore.getState().signOut();
  });

  it('persists tokens on signIn and hydrates them', async () => {
    await useAuthStore.getState().signIn({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: '1', name: 'A', email: 'a@x.com', role: 'seeker', listerType: null },
    });
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().accessToken).toBe('a');
    expect(useAuthStore.getState().user?.email).toBe('a@x.com');
  });
});
