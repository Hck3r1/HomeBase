import type { Gender, ListingInterest, ListerType, Role, SetupStep, User, UserPreference } from '@prisma/client';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  listerType: ListerType | null;
  phone: string | null;
  avatarUrl: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  setupStep: SetupStep;
  setupCompletedAt: string | null;
  preferences: PublicUserPreferences | null;
};

export type PublicUserPreferences = {
  listingTypes: ListingInterest[];
  budgetMin: number | null;
  budgetMax: number | null;
  preferredCity: string | null;
  bedroomsMin: number | null;
  serviceAreas: string[];
};

type UserWithPreferences = User & { preferences?: UserPreference | null };

export function publicUserPreferences(p: UserPreference | null | undefined): PublicUserPreferences | null {
  if (!p) return null;
  return {
    listingTypes: p.listingTypes,
    budgetMin: p.budgetMin,
    budgetMax: p.budgetMax,
    preferredCity: p.preferredCity,
    bedroomsMin: p.bedroomsMin,
    serviceAreas: p.serviceAreas,
  };
}

export function publicUser(u: UserWithPreferences): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    listerType: u.listerType,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    dateOfBirth: u.dateOfBirth ? u.dateOfBirth.toISOString() : null,
    gender: u.gender,
    setupStep: u.setupStep,
    setupCompletedAt: u.setupCompletedAt ? u.setupCompletedAt.toISOString() : null,
    preferences: publicUserPreferences(u.preferences),
  };
}
