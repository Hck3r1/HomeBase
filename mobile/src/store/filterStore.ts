import { create } from 'zustand';
import { ListingFilters } from '../api/listings';
import { ListingType } from '../types/listing';

type Sort = 'recent' | 'oldest' | 'price_asc' | 'price_desc';

interface FilterState {
  type: ListingType;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities: string[];
  propertyType?: string;
  sort: Sort;
  setType: (type: ListingType) => void;
  setQuery: (q?: string) => void;
  setPriceRange: (min?: number, max?: number) => void;
  setBedrooms: (n?: number) => void;
  setBathrooms: (n?: number) => void;
  setPropertyType: (p?: string) => void;
  setSort: (s: Sort) => void;
  toggleAmenity: (a: string) => void;
  reset: () => void;
  toFilters: () => ListingFilters;
}

const initial = {
  type: 'rent' as ListingType,
  q: undefined as string | undefined,
  minPrice: undefined as number | undefined,
  maxPrice: undefined as number | undefined,
  bedrooms: undefined as number | undefined,
  bathrooms: undefined as number | undefined,
  amenities: [] as string[],
  propertyType: undefined as string | undefined,
  sort: 'recent' as Sort,
};

export const useFilterStore = create<FilterState>((set, get) => ({
  ...initial,
  setType: (type) => set({ type }),
  setQuery: (q) => set({ q: q || undefined }),
  setPriceRange: (minPrice, maxPrice) => set({ minPrice, maxPrice }),
  setBedrooms: (bedrooms) => set({ bedrooms }),
  setBathrooms: (bathrooms) => set({ bathrooms }),
  setPropertyType: (propertyType) => set({ propertyType }),
  setSort: (sort) => set({ sort }),
  toggleAmenity: (a) =>
    set((state) => ({
      amenities: state.amenities.includes(a)
        ? state.amenities.filter((x) => x !== a)
        : [...state.amenities, a],
    })),
  reset: () => set({ ...initial }),
  toFilters: () => {
    const s = get();
    const filters: ListingFilters = { type: s.type, sort: s.sort };
    if (s.q) filters.q = s.q;
    if (s.minPrice != null) filters.minPrice = s.minPrice;
    if (s.maxPrice != null) filters.maxPrice = s.maxPrice;
    if (s.bedrooms != null) filters.bedrooms = s.bedrooms;
    if (s.bathrooms != null) filters.bathrooms = s.bathrooms;
    if (s.propertyType) filters.propertyType = s.propertyType;
    if (s.amenities.length) filters.amenities = s.amenities;
    return filters;
  },
}));
