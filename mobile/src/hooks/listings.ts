import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateListingInput,
  ListingFilters,
  createListing,
  fetchListing,
  fetchListings,
  fetchMyListings,
  fetchNearby,
  updateListing,
  updateListingStatus,
} from '../api/listings';
import type { ListingType } from '../types/listing';

export const listingKeys = {
  all: ['listings'] as const,
  list: (filters: ListingFilters) => ['listings', 'list', filters] as const,
  nearby: (args: { lat: number; lng: number; radius?: number; type?: ListingType }) =>
    ['listings', 'nearby', args] as const,
  detail: (id: string) => ['listings', 'detail', id] as const,
  mine: ['listings', 'mine'] as const,
};

export function useListings(filters: ListingFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listingKeys.list(filters),
    queryFn: () => fetchListings(filters),
    enabled: options?.enabled ?? true,
  });
}

export function useNearbyListings(
  args: { lat: number; lng: number; radius?: number; type?: ListingType } | null,
) {
  return useQuery({
    queryKey: listingKeys.nearby(args ?? { lat: 0, lng: 0 }),
    queryFn: () => fetchNearby(args!),
    enabled: args != null,
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: listingKeys.detail(id),
    queryFn: () => fetchListing(id),
    enabled: Boolean(id),
  });
}

export function useMyListings() {
  return useQuery({ queryKey: listingKeys.mine, queryFn: fetchMyListings });
}

export function useCreateListing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateListingInput) => createListing(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listingKeys.mine });
      qc.invalidateQueries({ queryKey: listingKeys.all });
    },
  });
}

export function useUpdateListing(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title?: string;
      description?: string;
      amenities?: string[];
      bedrooms?: number;
      bathrooms?: number;
    }) => updateListing(id, input),
    onSuccess: (listing) => {
      qc.setQueryData(listingKeys.detail(id), listing);
      qc.invalidateQueries({ queryKey: listingKeys.mine });
      qc.invalidateQueries({ queryKey: listingKeys.all });
    },
  });
}

export function useUpdateListingStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: string) => updateListingStatus(id, status),
    onSuccess: (listing) => {
      qc.setQueryData(listingKeys.detail(id), listing);
      qc.invalidateQueries({ queryKey: listingKeys.mine });
      qc.invalidateQueries({ queryKey: listingKeys.all });
    },
  });
}

export function useSavedListings(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: listingKeys.detail(id),
      queryFn: () => fetchListing(id),
      enabled: Boolean(id),
    })),
  });
}
