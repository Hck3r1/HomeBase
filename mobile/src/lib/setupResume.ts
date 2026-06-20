import type { AuthUser } from '../store/authStore';
import type { SetupStackParamList } from '../navigation/SetupStack';

export type SetupStep = NonNullable<AuthUser['setupStep']>;

const ROUTE_BY_STEP: Record<SetupStep, keyof SetupStackParamList> = {
  profile: 'ProfileSetup',
  role: 'RoleSetup',
  preferences: 'PreferencesSetup',
  kyc: 'KycIntro',
};

export function getSetupResumeRoute(user: AuthUser | null | undefined): keyof SetupStackParamList {
  if (!user || user.setupCompletedAt) return 'ProfileSetup';
  if (user.setupStep && user.setupStep in ROUTE_BY_STEP) {
    return ROUTE_BY_STEP[user.setupStep];
  }
  if (!user.gender) return 'ProfileSetup';
  if (!user.preferences?.listingTypes?.length) return 'RoleSetup';
  if (user.role === 'lister') return 'KycIntro';
  return 'PreferencesSetup';
}
