import { useMemo } from 'react';
import { ListingFilters } from '../api/listings';
import { useFilterStore } from '../store/filterStore';

/** Reactive listing filters derived from the Zustand store (includes all facet fields). */
export function useListingFilters(page?: number, pageSize?: number): ListingFilters {
  const type = useFilterStore((s) => s.type);
  const q = useFilterStore((s) => s.q);
  const sort = useFilterStore((s) => s.sort);
  const minPrice = useFilterStore((s) => s.minPrice);
  const maxPrice = useFilterStore((s) => s.maxPrice);
  const bedrooms = useFilterStore((s) => s.bedrooms);
  const bathrooms = useFilterStore((s) => s.bathrooms);
  const propertyType = useFilterStore((s) => s.propertyType);
  const amenitiesKey = useFilterStore((s) => s.amenities.join(','));

  return useMemo(() => {
    const base = useFilterStore.getState().toFilters();
    return {
      ...base,
      ...(page != null ? { page } : {}),
      ...(pageSize != null ? { pageSize } : {}),
    };
  }, [
    type,
    q,
    sort,
    minPrice,
    maxPrice,
    bedrooms,
    bathrooms,
    propertyType,
    amenitiesKey,
    page,
    pageSize,
  ]);
}

/** Stable key for resetting pagination when facets change. */
export function useListingFilterKey(): string {
  const type = useFilterStore((s) => s.type);
  const q = useFilterStore((s) => s.q);
  const sort = useFilterStore((s) => s.sort);
  const minPrice = useFilterStore((s) => s.minPrice);
  const maxPrice = useFilterStore((s) => s.maxPrice);
  const bedrooms = useFilterStore((s) => s.bedrooms);
  const bathrooms = useFilterStore((s) => s.bathrooms);
  const propertyType = useFilterStore((s) => s.propertyType);
  const amenitiesKey = useFilterStore((s) => s.amenities.join(','));

  return useMemo(
    () => JSON.stringify(useFilterStore.getState().toFilters()),
    [type, q, sort, minPrice, maxPrice, bedrooms, bathrooms, propertyType, amenitiesKey],
  );
}
