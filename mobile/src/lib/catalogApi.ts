import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { AuthUser, Gender, ListingInterest } from '../store/authStore';

export type CatalogOption = {
  code: string;
  label: string;
  minValue: number | null;
  maxValue: number | null;
};

export type SetupCatalog = {
  cities: CatalogOption[];
  listingTypes: CatalogOption[];
  seekerBudgetPresets: CatalogOption[];
  listerPricePresets: CatalogOption[];
  genders: CatalogOption[];
  bedroomOptions: CatalogOption[];
  defaults: {
    seeker: {
      listingTypes: ListingInterest[];
      budgetMin: number | null;
      budgetMax: number | null;
      preferredCity: string | null;
      bedroomsMin: number | null;
      serviceAreas: string[];
    };
    lister: {
      listingTypes: ListingInterest[];
      budgetMin: number | null;
      budgetMax: number | null;
      preferredCity: string | null;
      bedroomsMin: number | null;
      serviceAreas: string[];
    };
  };
};

export async function fetchSetupCatalog(): Promise<SetupCatalog> {
  const { data } = await api.get<SetupCatalog>('/catalog/setup-options');
  return data;
}

export function useSetupCatalog() {
  return useQuery({
    queryKey: ['catalog', 'setup-options'],
    queryFn: fetchSetupCatalog,
    staleTime: 5 * 60_000,
  });
}

export type { Gender };
