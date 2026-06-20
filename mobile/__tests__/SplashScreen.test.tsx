import React from 'react';
import { act, render } from '@testing-library/react-native';
import { SplashScreen } from '../src/screens/auth/SplashScreen';
import { useAuthStore } from '../src/store/authStore';

const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => void (store[k] = v)),
  getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
  deleteItemAsync: jest.fn(async (k: string) => void delete store[k]),
}));

jest.mock('../src/components/HomeBaseMark', () => ({
  HomeBaseMark: () => null,
}));

const navigation = { replace: jest.fn(), navigate: jest.fn() };

describe('SplashScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    navigation.replace.mockClear();
    Object.keys(store).forEach((k) => delete store[k]);
    useAuthStore.setState({
      hydrated: false,
      splashFinished: false,
      showOnboarding: true,
      accessToken: null,
      refreshToken: null,
      user: null,
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders branding', () => {
    const { getByText, unmount } = render(<SplashScreen navigation={navigation as any} route={{ key: 'Splash', name: 'Splash' }} />);
    expect(getByText('HomeBase')).toBeTruthy();
    unmount();
  });

  it('navigates to walkthrough before first login', () => {
    useAuthStore.setState({ hydrated: true, showOnboarding: true });
    const { unmount } = render(<SplashScreen navigation={navigation as any} route={{ key: 'Splash', name: 'Splash' }} />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(navigation.replace).toHaveBeenCalledWith('Walkthrough');
    unmount();
  });

  it('navigates to login when onboarding is not needed', () => {
    useAuthStore.setState({ hydrated: true, showOnboarding: false });
    const { unmount } = render(<SplashScreen navigation={navigation as any} route={{ key: 'Splash', name: 'Splash' }} />);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(navigation.replace).toHaveBeenCalledWith('LogIn');
    unmount();
  });
});
