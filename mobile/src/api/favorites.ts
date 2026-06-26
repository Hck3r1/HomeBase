import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import {
  Listing,
  ListingType,
  RentDetails,
  SaleDetails,
  ShortstayDetails,
} from '../types/listing';

export interface FavoriteListing {
  id: string;
  title: string;
  listingType: ListingType;
  city?: string;
  state?: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  propertyType?: string;
  photos?: { id: string; url: string; cloudinaryPublicId?: string; position?: number }[];
  rent?: RentDetails | null;
  sale?: SaleDetails | null;
  shortstay?: ShortstayDetails | null;
}

export interface Favorite {
  id: string;
  listingId: string;
  listing: FavoriteListing;
}

export const favoritesKey = ['favorites'] as const;

export function favoriteListingToListing(raw: FavoriteListing): Listing {
  const {
    rent,
    sale,
    shortstay,
    photos = [],
    city = '',
    state = '',
    bedrooms = null,
    bathrooms = null,
    propertyType = '',
    ...base
  } = raw;

  return {
    ...base,
    ownerId: '',
    status: 'active',
    description: '',
    amenities: [],
    address: '',
    city,
    state,
    lat: 0,
    lng: 0,
    bedrooms,
    bathrooms,
    areaSqm: null,
    propertyType,
    photos: photos.map((p, i) => ({
      id: p.id,
      url: p.url,
      cloudinaryPublicId: p.cloudinaryPublicId ?? '',
      position: p.position ?? i,
    })),
    rentDetails: rent ?? null,
    saleDetails: sale ?? null,
    shortstayDetails: shortstay ?? null,
    createdAt: '',
    updatedAt: '',
  };
}

export function useFavorites() {
  return useQuery({
    queryKey: favoritesKey,
    queryFn: async () => {
      const { data } = await api.get<Array<{ id: string; listingId: string; listing: FavoriteListing }>>('/favorites');
      return data.map((f) => ({
        id: f.id,
        listingId: f.listingId,
        listing: f.listing,
      })) satisfies Favorite[];
    },
  });
}

export function useIsFavorite(listingId: string) {
  const { data } = useFavorites();
  return Boolean(data?.some((f) => f.listingId === listingId));
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, isFavorited }: { listingId: string; isFavorited: boolean }) => {
      if (isFavorited) {
        await api.delete(`/favorites/${listingId}`);
      } else {
        await api.post(`/favorites/${listingId}`);
      }
      return { listingId, isFavorited: !isFavorited };
    },
    onMutate: async ({ listingId, isFavorited }) => {
      await qc.cancelQueries({ queryKey: favoritesKey });
      const previous = qc.getQueryData<Favorite[]>(favoritesKey) ?? [];
      qc.setQueryData<Favorite[]>(favoritesKey, (old = []) =>
        isFavorited
          ? old.filter((f) => f.listingId !== listingId)
          : [
              ...old,
              {
                id: `optimistic-${listingId}`,
                listingId,
                listing: { id: listingId, title: '', listingType: 'rent' },
              },
            ],
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(favoritesKey, ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: favoritesKey });
    },
  });
}
