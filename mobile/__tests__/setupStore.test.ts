import { useAuthStore } from '../src/store/authStore';

describe('authStore needsSetup', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      hydrated: true,
      splashFinished: true,
      showOnboarding: false,
    });
  });

  it('requires setup for authenticated users without setupCompletedAt', () => {
    useAuthStore.setState({
      accessToken: 'token',
      user: {
        id: '1',
        name: 'A',
        email: 'a@x.com',
        role: 'seeker',
        listerType: null,
        setupCompletedAt: null,
      },
    });
    expect(useAuthStore.getState().needsSetup()).toBe(true);
  });

  it('skips setup when setupCompletedAt is set', () => {
    useAuthStore.setState({
      accessToken: 'token',
      user: {
        id: '1',
        name: 'A',
        email: 'a@x.com',
        role: 'seeker',
        listerType: null,
        setupCompletedAt: '2026-06-19T00:00:00.000Z',
      },
    });
    expect(useAuthStore.getState().needsSetup()).toBe(false);
  });

  it('sets splashFinished on signIn so setup can show immediately', async () => {
    await useAuthStore.getState().signIn({
      accessToken: 'token',
      refreshToken: 'refresh',
      user: {
        id: '1',
        name: 'A',
        email: 'a@x.com',
        role: 'seeker',
        listerType: null,
        setupCompletedAt: null,
      },
    });
    expect(useAuthStore.getState().splashFinished).toBe(true);
    expect(useAuthStore.getState().needsSetup()).toBe(true);
  });
});
