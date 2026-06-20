import { secureStorage } from './secureStorage';

/** TODO: set to false before release — forces walkthrough on every guest cold start while iterating. */
export const FORCE_ONBOARDING_ON_RESTART = true;

const HAS_LOGGED_IN_KEY = 'hb_has_logged_in';
const HAS_SEEN_ONBOARDING_KEY = 'hb_has_seen_onboarding';
const SHOW_AFTER_LOGOUT_KEY = 'hb_show_onboarding_after_logout';

export const onboardingStorage = {
  hasLoggedInBefore: async () => (await secureStorage.get(HAS_LOGGED_IN_KEY)) === '1',
  markLoggedInBefore: () => secureStorage.set(HAS_LOGGED_IN_KEY, '1'),

  hasSeenOnboarding: async () => (await secureStorage.get(HAS_SEEN_ONBOARDING_KEY)) === '1',
  markOnboardingSeen: () => secureStorage.set(HAS_SEEN_ONBOARDING_KEY, '1'),

  shouldShowForGuest: async () => {
    if (FORCE_ONBOARDING_ON_RESTART) return true;

    const [hasLoggedIn, showAfterLogout, hasSeenOnboarding] = await Promise.all([
      onboardingStorage.hasLoggedInBefore(),
      onboardingStorage.isShowAfterLogout(),
      onboardingStorage.hasSeenOnboarding(),
    ]);
    if (showAfterLogout) return true;
    if (hasLoggedIn) return false;
    return !hasSeenOnboarding;
  },

  isShowAfterLogout: async () => (await secureStorage.get(SHOW_AFTER_LOGOUT_KEY)) === '1',
  setShowAfterLogout: () => secureStorage.set(SHOW_AFTER_LOGOUT_KEY, '1'),
  clearShowAfterLogout: () => secureStorage.remove(SHOW_AFTER_LOGOUT_KEY),
};
