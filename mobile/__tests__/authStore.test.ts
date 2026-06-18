import { useAuthStore } from '../src/store/authStore';

describe('authStore', () => {
  beforeEach(() => useAuthStore.getState().clear());

  it('starts signed out', () => {
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it('stores tokens on signIn', () => {
    useAuthStore.getState().signIn({ accessToken: 'a', refreshToken: 'r' });
    expect(useAuthStore.getState().accessToken).toBe('a');
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
  });

  it('clears tokens on signOut', () => {
    useAuthStore.getState().signIn({ accessToken: 'a', refreshToken: 'r' });
    useAuthStore.getState().signOut();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
