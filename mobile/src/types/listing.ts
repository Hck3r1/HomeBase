export type ListingType = 'rent' | 'sale' | 'shortstay';
export type ListingStatus = 'draft' | 'active' | 'paused' | 'rented' | 'sold';

export interface ListingPhoto {
  id: string;
  cloudinaryPublicId: string;
  url: string;
  position: number;
}

export interface RentDetails {
  monthlyRent: number | null;
  annualRent: number | null;
  securityDeposit: number | null;
  leaseTermMonths: number | null;
  availableFrom: string | null;
}

export interface SaleDetails {
  salePrice: number;
  negotiable: boolean;
  titleDocsVerified: boolean;
}

export interface ShortstayDetails {
  nightlyRate: number;
  cleaningFee: number;
  minNights: number;
  maxNights: number | null;
  maxGuests: number;
  houseRules: string | null;
}

export interface ListingOwner {
  id: string;
  name: string;
  avatarUrl?: string | null;
  listerType?: string | null;
}

export interface Listing {
  id: string;
  ownerId: string;
  owner?: ListingOwner;
  listingType: ListingType;
  status: ListingStatus;
  title: string;
  description: string;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqm: number | null;
  amenities: string[];
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  photos: ListingPhoto[];
  rentDetails: RentDetails | null;
  saleDetails: SaleDetails | null;
  shortstayDetails: ShortstayDetails | null;
  createdAt: string;
  updatedAt: string;
}

export interface NearbyListing extends Listing {
  distanceMeters: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
