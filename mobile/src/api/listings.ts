import { api } from '../lib/api';
import {
  Listing,
  ListingOwner,
  ListingType,
  NearbyListing,
  Paginated,
  RentDetails,
  SaleDetails,
  ShortstayDetails,
} from '../types/listing';

export interface ListingFilters {
  type?: ListingType;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  propertyType?: string;
  sort?: 'recent' | 'oldest' | 'price_asc' | 'price_desc';
  page?: number;
  pageSize?: number;
}

type ApiListing = Omit<Listing, 'rentDetails' | 'saleDetails' | 'shortstayDetails' | 'owner'> & {
  rent?: RentDetails | null;
  sale?: SaleDetails | null;
  shortstay?: ShortstayDetails | null;
  owner?: ListingOwner;
};

function normalizeListing(raw: ApiListing): Listing {
  const { rent, sale, shortstay, owner, ...base } = raw;
  return {
    ...base,
    owner,
    rentDetails: rent ?? null,
    saleDetails: sale ?? null,
    shortstayDetails: shortstay ?? null,
  };
}

function toParams(filters: ListingFilters) {
  const sortMap: Record<string, string | undefined> = {
    recent: 'recent',
    oldest: 'recent',
    price_asc: 'priceAsc',
    price_desc: 'priceDesc',
  };
  return {
    type: filters.type,
    q: filters.q,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    bedrooms: filters.bedrooms,
    bathrooms: filters.bathrooms,
    propertyType: filters.propertyType,
    page: filters.page,
    pageSize: filters.pageSize,
    sort: filters.sort ? sortMap[filters.sort] : undefined,
    amenities: filters.amenities?.length ? filters.amenities.join(',') : undefined,
  };
}

export async function fetchListings(filters: ListingFilters): Promise<Paginated<Listing>> {
  const { data } = await api.get<Paginated<ApiListing>>('/listings', { params: toParams(filters) });
  return { ...data, data: data.data.map(normalizeListing) };
}

export async function fetchNearby(args: {
  lat: number;
  lng: number;
  radius?: number;
}): Promise<NearbyListing[]> {
  const { data } = await api.get<{ data: NearbyListing[] }>('/listings/nearby', { params: args });
  return data.data;
}

export async function fetchListing(id: string): Promise<Listing> {
  const { data } = await api.get<ApiListing>(`/listings/${id}`);
  return normalizeListing(data);
}

export interface CreateListingInput {
  listingType: ListingType;
  title: string;
  description: string;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  amenities: string[];
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  rent?: {
    monthlyRent?: number;
    annualRent?: number;
    securityDeposit?: number;
    leaseTermMonths?: number;
  };
  sale?: { salePrice: number; negotiable?: boolean };
  shortstay?: {
    nightlyRate: number;
    cleaningFee?: number;
    minNights?: number;
    maxNights?: number;
    maxGuests?: number;
    houseRules?: string;
  };
}

export async function createListing(input: CreateListingInput): Promise<Listing> {
  const { data } = await api.post<ApiListing>('/listings', input);
  return normalizeListing(data);
}

export async function updateListing(
  id: string,
  input: {
    title?: string;
    description?: string;
    amenities?: string[];
    bedrooms?: number;
    bathrooms?: number;
  },
): Promise<Listing> {
  const { data } = await api.patch<ApiListing>(`/listings/${id}`, input);
  return normalizeListing(data);
}

export async function updateListingStatus(id: string, status: string): Promise<Listing> {
  const { data } = await api.patch<ApiListing>(`/listings/${id}/status`, { status });
  return normalizeListing(data);
}

export async function fetchMyListings(): Promise<Listing[]> {
  const { data } = await api.get<{ data: ApiListing[] }>('/me/listings');
  return data.data.map(normalizeListing);
}

export interface PhotoSignature {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export async function signPhotoUpload(listingId: string): Promise<PhotoSignature> {
  const { data } = await api.post<PhotoSignature>(`/listings/${listingId}/photos/sign`);
  return data;
}

export async function addPhoto(
  listingId: string,
  body: { cloudinaryPublicId: string; url: string; position?: number },
): Promise<void> {
  await api.post(`/listings/${listingId}/photos`, body);
}
