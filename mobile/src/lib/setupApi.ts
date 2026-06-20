import { api } from './api';
import type { AuthUser, ListingInterest } from '../store/authStore';

export type Gender = 'male' | 'female' | 'prefer_not_to_say';

export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  dateOfBirth?: string | null;
  gender?: Gender | null;
}

export interface UpdatePreferencesPayload {
  listingTypes?: ListingInterest[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  preferredCity?: string | null;
  bedroomsMin?: number | null;
  serviceAreas?: string[];
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  const { data } = await api.patch<AuthUser>('/me', payload);
  return data;
}

export async function updateRole(
  role: 'seeker' | 'lister',
  listerType?: 'agent' | 'landlord',
): Promise<AuthUser> {
  const body = role === 'lister' ? { role, listerType } : { role };
  const { data } = await api.patch<AuthUser>('/me/role', body);
  return data;
}

export async function updatePreferences(payload: UpdatePreferencesPayload): Promise<AuthUser> {
  const { data } = await api.patch<AuthUser>('/me/preferences', payload);
  return data;
}

export async function completeSetup(): Promise<AuthUser> {
  const { data } = await api.post<AuthUser>('/me/setup-complete');
  return data;
}

export function formatBudget(naira: number): string {
  if (naira >= 1_000_000) return `₦${(naira / 1_000_000).toFixed(naira % 1_000_000 === 0 ? 0 : 1)}M`;
  if (naira >= 1_000) return `₦${Math.round(naira / 1_000)}K`;
  return `₦${naira}`;
}
