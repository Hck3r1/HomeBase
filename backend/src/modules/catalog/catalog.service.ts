import { prisma } from '../../lib/prisma';
import type { ListingInterest } from '@prisma/client';

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

function mapOption(row: {
  code: string;
  label: string;
  minValue: number | null;
  maxValue: number | null;
}): CatalogOption {
  return {
    code: row.code,
    label: row.label,
    minValue: row.minValue,
    maxValue: row.maxValue,
  };
}

export async function getSetupCatalog(): Promise<SetupCatalog> {
  const rows = await prisma.refOption.findMany({
    where: { active: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });

  const byCategory = (category: string) =>
    rows.filter((r) => r.category === category).map(mapOption);

  const cities = byCategory('city');
  const listingTypes = byCategory('listing_type');
  const seekerBudgetPresets = byCategory('budget_preset_seeker');
  const listerPricePresets = byCategory('budget_preset_lister');
  const genders = byCategory('gender');
  const bedroomOptions = byCategory('bedroom');

  const defaultCity = cities[0]?.label ?? 'Lagos';
  const defaultSeekerBudget = seekerBudgetPresets[1] ?? seekerBudgetPresets[0];
  const defaultListingType = (listingTypes[0]?.code ?? 'rent') as ListingInterest;

  return {
    cities,
    listingTypes,
    seekerBudgetPresets,
    listerPricePresets,
    genders,
    bedroomOptions,
    defaults: {
      seeker: {
        listingTypes: [defaultListingType],
        budgetMin: defaultSeekerBudget?.minValue ?? null,
        budgetMax: defaultSeekerBudget?.maxValue ?? null,
        preferredCity: defaultCity,
        bedroomsMin: bedroomOptions[1]?.minValue ?? 2,
        serviceAreas: [],
      },
      lister: {
        listingTypes: [defaultListingType],
        budgetMin: null,
        budgetMax: null,
        preferredCity: null,
        bedroomsMin: null,
        serviceAreas: [defaultCity],
      },
    },
  };
}
