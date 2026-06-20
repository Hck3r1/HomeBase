import { getSetupResumeRoute } from '../src/lib/setupResume';
import type { AuthUser } from '../src/store/authStore';

const baseUser: AuthUser = {
  id: '1',
  name: 'Maya',
  email: 'maya@x.com',
  role: 'seeker',
  listerType: null,
  setupCompletedAt: null,
};

describe('getSetupResumeRoute', () => {
  it('starts at profile when setup has not begun', () => {
    expect(getSetupResumeRoute({ ...baseUser, setupStep: 'profile', gender: null })).toBe('ProfileSetup');
  });

  it('resumes at role after profile is saved', () => {
    expect(
      getSetupResumeRoute({
        ...baseUser,
        setupStep: 'role',
        gender: 'female',
      }),
    ).toBe('RoleSetup');
  });

  it('resumes at preferences after role is saved', () => {
    expect(
      getSetupResumeRoute({
        ...baseUser,
        setupStep: 'preferences',
        gender: 'female',
      }),
    ).toBe('PreferencesSetup');
  });

  it('resumes at kyc for listers who saved preferences', () => {
    expect(
      getSetupResumeRoute({
        ...baseUser,
        role: 'lister',
        listerType: 'agent',
        setupStep: 'kyc',
        gender: 'female',
        preferences: {
          listingTypes: ['rent'],
          budgetMin: 0,
          budgetMax: 1_000_000,
          preferredCity: null,
          bedroomsMin: null,
          serviceAreas: ['Lagos'],
        },
      }),
    ).toBe('KycIntro');
  });
});
