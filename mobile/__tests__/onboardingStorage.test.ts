const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => void (store[k] = v)),
  getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
  deleteItemAsync: jest.fn(async (k: string) => void delete store[k]),
}));

import { onboardingStorage } from '../src/lib/onboardingStorage';

describe('onboardingStorage', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it('shows onboarding for guests who have never logged in', async () => {
    expect(await onboardingStorage.shouldShowForGuest()).toBe(true);
  });

  it('hides onboarding for guests who have logged in before', async () => {
    await onboardingStorage.markLoggedInBefore();
    expect(await onboardingStorage.shouldShowForGuest()).toBe(true);
  });

  it('hides onboarding after walkthrough is completed without login', async () => {
    await onboardingStorage.markOnboardingSeen();
    expect(await onboardingStorage.shouldShowForGuest()).toBe(true);
  });

  it('shows onboarding again after logout', async () => {
    await onboardingStorage.markLoggedInBefore();
    await onboardingStorage.setShowAfterLogout();
    expect(await onboardingStorage.shouldShowForGuest()).toBe(true);
  });
});
