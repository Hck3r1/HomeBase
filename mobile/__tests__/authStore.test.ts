const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => void (store[k] = v)),
  getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
  deleteItemAsync: jest.fn(async (k: string) => void delete store[k]),
}));

import { useAuthStore } from '../src/store/authStore';

const user = { id: '1', name: 'A', email: 'a@x.com', role: 'seeker' as const, listerType: null };

describe('authStore', () => {
  beforeEach(async () => {
    Object.keys(store).forEach((k) => delete store[k]);
    await useAuthStore.getState().signOut();
    useAuthStore.setState({ hydrated: false, splashFinished: false, showOnboarding: true });
  });

  it('starts signed out with onboarding enabled', () => {
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().showOnboarding).toBe(true);
  });

  it('stores tokens on signIn and hides onboarding', async () => {
    await useAuthStore.getState().signIn({ accessToken: 'a', refreshToken: 'r', user });
    expect(useAuthStore.getState().accessToken).toBe('a');
    expect(useAuthStore.getState().showOnboarding).toBe(false);
    expect(store.hb_has_logged_in).toBe('1');
  });

  it('shows onboarding again on signOut', async () => {
    await useAuthStore.getState().signIn({ accessToken: 'a', refreshToken: 'r', user });
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().showOnboarding).toBe(true);
    expect(store.hb_show_onboarding_after_logout).toBe('1');
  });

  it('clears logout onboarding flag on signIn', async () => {
    await useAuthStore.getState().signIn({ accessToken: 'a', refreshToken: 'r', user });
    await useAuthStore.getState().signOut();
    await useAuthStore.getState().signIn({ accessToken: 'b', refreshToken: 'r2', user });
    expect(store.hb_show_onboarding_after_logout).toBeUndefined();
    expect(useAuthStore.getState().showOnboarding).toBe(false);
  });
});
