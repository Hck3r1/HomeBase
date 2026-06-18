# Phase 2 — Listings & Discovery (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the HomeBase discovery & lister-tooling experience on top of the Phase 0 Expo shell: typed listing API + React Query hooks, a Zustand filter store, the reusable `ListingCard` and segmented Rent/Buy/Short-stay pills, the Home feed, Search filters bottom sheet, Search results, Map view with clustered pins, Listing detail (gallery + type-specific block + lister card + contextual CTA), a photo lightbox, and the lister Create/Edit/My-listings flows — all in the teal design system.

**Architecture:** Server state lives in React Query hooks (`src/hooks/listings.ts`) wrapping thin Axios calls (`src/api/listings.ts`) over the Phase 0 `api` instance. Ephemeral search UI state lives in a Zustand `filterStore` (`src/store/filterStore.ts`) that serializes to the backend's query params. Presentational pieces (`ListingCard`, `SegmentedTypePills`, `PriceText`) consume the Phase 0 `theme` and primitives (`Button`, `AppTextInput`, `Screen`). New screens live under `src/screens/listings/` and `src/screens/lister/`, wired into a `ListingsStack` added to the existing `MainTabs`. Maps use `react-native-maps` with `react-native-map-clustering`; the multi-step create flow uses `expo-image-picker` for photo selection and the `/listings/:id/photos/sign` → Cloudinary → `/listings/:id/photos` round-trip from the backend plan.

**Tech Stack:** Expo, React Native, TypeScript, React Navigation (native-stack + bottom-tabs), @tanstack/react-query, Zustand, Axios, react-native-maps, react-native-map-clustering, expo-image-picker, Jest (jest-expo) + @testing-library/react-native.

> **Note on git:** Each task ends with a commit run in your own terminal. All paths below are relative to `mobile/` unless noted.

> **Reused from Phase 0 (do NOT redefine):** `src/lib/api.ts` (`api`), `src/lib/queryClient.ts` (`queryClient`), `src/theme` (`theme`), `src/components/{Button,TextInput,Screen}`, `src/store/authStore.ts`, `src/navigation/{RootNavigator,MainTabs}`.

> **Backend contract (from `2026-06-19-phase2-listings-backend.md`):**
> - `GET /listings` → `{ data: Listing[], total, page, pageSize }`
> - `GET /listings/nearby` → `{ data: (Listing-ish + distanceMeters)[] }`
> - `GET /listings/:id`, `POST /listings`, `PATCH /listings/:id`, `PATCH /listings/:id/status` → `Listing`
> - `GET /me/listings` → `{ data: Listing[] }`
> - `POST /listings/:id/photos/sign` → `{ timestamp, signature, apiKey, cloudName, folder }`
> - `POST /listings/:id/photos` → `ListingPhoto`. Money is integer **kobo**.

---

## File Structure (created in this phase)

```
mobile/
└── src/
    ├── types/listing.ts
    ├── lib/format.ts                       # formatNaira(kobo), priceForListing
    ├── api/listings.ts                     # axios calls
    ├── hooks/listings.ts                   # react-query hooks
    ├── store/filterStore.ts                # zustand search filters
    ├── components/
    │   ├── ListingCard.tsx
    │   ├── SegmentedTypePills.tsx
    │   └── PriceText.tsx
    └── screens/
        ├── listings/
        │   ├── HomeFeedScreen.tsx
        │   ├── SearchResultsScreen.tsx
        │   ├── SearchFiltersSheet.tsx
        │   ├── MapViewScreen.tsx
        │   ├── ListingDetailScreen.tsx
        │   └── PhotoGalleryScreen.tsx
        └── lister/
            ├── CreateListingScreen.tsx
            ├── EditListingScreen.tsx
            └── MyListingsScreen.tsx
    └── navigation/ListingsStack.tsx
__tests__/
    ├── format.test.ts
    ├── filterStore.test.ts
    ├── listingsHooks.test.tsx
    ├── ListingCard.test.tsx
    └── SegmentedTypePills.test.tsx
```

---

## Task 1: Install Phase 2 native dependencies

**Files:**
- Modify: `mobile/package.json`

- [ ] **Step 1: Install maps, clustering, and image picker**

Run:
```bash
cd ~/Projects/HomeBase/mobile
npx expo install react-native-maps expo-image-picker
npm install react-native-map-clustering
```

- [ ] **Step 2: Verify the bundler still resolves**

Run: `npx expo start --no-dev --offline` (start Metro, confirm no resolution errors, then Ctrl-C).
Expected: Metro boots without "unable to resolve" errors for the new packages.

- [ ] **Step 3: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "chore(mobile): install react-native-maps, clustering, expo-image-picker"
```

---

## Task 2: Listing types

**Files:**
- Create: `mobile/src/types/listing.ts`

- [ ] **Step 1: Write the types**

`mobile/src/types/listing.ts`:
```ts
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

export interface Listing {
  id: string;
  ownerId: string;
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

export interface NearbyListing {
  id: string;
  title: string;
  listingType: ListingType;
  status: ListingStatus;
  city: string;
  state: string;
  lat: number;
  lng: number;
  distanceMeters: number;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/types/listing.ts
git commit -m "feat(mobile): listing domain types"
```

---

## Task 3: Money formatting helpers

**Files:**
- Create: `mobile/src/lib/format.ts`
- Test: `mobile/__tests__/format.test.ts`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/format.test.ts`:
```ts
import { formatNaira, priceLabelForListing } from '../src/lib/format';
import { Listing } from '../src/types/listing';

describe('formatNaira', () => {
  it('formats kobo into ₦ with thousands separators', () => {
    expect(formatNaira(45_000_00)).toBe('₦45,000');
    expect(formatNaira(250_000_000_00)).toBe('₦250,000,000');
  });
});

describe('priceLabelForListing', () => {
  const base = {
    id: '1', ownerId: 'o', status: 'active', title: 't', description: 'd',
    propertyType: 'house', bedrooms: 2, bathrooms: 2, areaSqm: null, amenities: [],
    address: 'a', city: 'Lagos', state: 'Lagos', lat: 0, lng: 0, photos: [],
    rentDetails: null, saleDetails: null, shortstayDetails: null,
    createdAt: '', updatedAt: '',
  };

  it('labels rent per month, sale flat, and shortstay per night', () => {
    const rent = { ...base, listingType: 'rent', rentDetails: { monthlyRent: 350_000_00, annualRent: null, securityDeposit: null, leaseTermMonths: null, availableFrom: null } } as Listing;
    const sale = { ...base, listingType: 'sale', saleDetails: { salePrice: 60_000_000_00, negotiable: false, titleDocsVerified: false } } as Listing;
    const stay = { ...base, listingType: 'shortstay', shortstayDetails: { nightlyRate: 45_000_00, cleaningFee: 0, minNights: 1, maxNights: null, maxGuests: 2, houseRules: null } } as Listing;

    expect(priceLabelForListing(rent)).toBe('₦350,000/mo');
    expect(priceLabelForListing(sale)).toBe('₦60,000,000');
    expect(priceLabelForListing(stay)).toBe('₦45,000/night');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- format`
Expected: FAIL — cannot find module `../src/lib/format`.

- [ ] **Step 3: Write the implementation**

`mobile/src/lib/format.ts`:
```ts
import { Listing } from '../types/listing';

/** Format integer kobo into a ₦ string (no decimals; NGN minor unit = kobo). */
export function formatNaira(kobo: number): string {
  const naira = Math.round(kobo / 100);
  return `₦${naira.toLocaleString('en-NG')}`;
}

/** Contextual price label depending on the listing type. */
export function priceLabelForListing(listing: Listing): string {
  switch (listing.listingType) {
    case 'rent': {
      const r = listing.rentDetails;
      if (r?.monthlyRent != null) return `${formatNaira(r.monthlyRent)}/mo`;
      if (r?.annualRent != null) return `${formatNaira(r.annualRent)}/yr`;
      return 'Price on request';
    }
    case 'sale':
      return listing.saleDetails ? formatNaira(listing.saleDetails.salePrice) : 'Price on request';
    case 'shortstay':
      return listing.shortstayDetails
        ? `${formatNaira(listing.shortstayDetails.nightlyRate)}/night`
        : 'Price on request';
    default:
      return 'Price on request';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- format`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/lib/format.ts mobile/__tests__/format.test.ts
git commit -m "feat(mobile): naira/kobo price formatting helpers"
```

---

## Task 4: Listings API client

**Files:**
- Create: `mobile/src/api/listings.ts`

- [ ] **Step 1: Write the API functions**

`mobile/src/api/listings.ts`:
```ts
import { api } from '../lib/api';
import {
  Listing,
  ListingType,
  NearbyListing,
  Paginated,
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
  rent?: { monthlyRent?: number; annualRent?: number; securityDeposit?: number; leaseTermMonths?: number };
  sale?: { salePrice: number; negotiable?: boolean };
  shortstay?: { nightlyRate: number; cleaningFee?: number; minNights?: number; maxNights?: number; maxGuests?: number; houseRules?: string };
}

function toParams(filters: ListingFilters) {
  return {
    ...filters,
    amenities: filters.amenities?.length ? filters.amenities.join(',') : undefined,
  };
}

export async function fetchListings(filters: ListingFilters): Promise<Paginated<Listing>> {
  const { data } = await api.get<Paginated<Listing>>('/listings', { params: toParams(filters) });
  return data;
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
  const { data } = await api.get<Listing>(`/listings/${id}`);
  return data;
}

export async function createListing(input: CreateListingInput): Promise<Listing> {
  const { data } = await api.post<Listing>('/listings', input);
  return data;
}

export async function updateListing(
  id: string,
  input: Partial<CreateListingInput>,
): Promise<Listing> {
  const { data } = await api.patch<Listing>(`/listings/${id}`, input);
  return data;
}

export async function updateListingStatus(id: string, status: string): Promise<Listing> {
  const { data } = await api.patch<Listing>(`/listings/${id}/status`, { status });
  return data;
}

export async function fetchMyListings(): Promise<Listing[]> {
  const { data } = await api.get<{ data: Listing[] }>('/me/listings');
  return data.data;
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
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/api/listings.ts
git commit -m "feat(mobile): listings api client"
```

---

## Task 5: React Query hooks

**Files:**
- Create: `mobile/src/hooks/listings.ts`
- Test: `mobile/__tests__/listingsHooks.test.tsx`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/listingsHooks.test.tsx`:
```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useListings, useListing } from '../src/hooks/listings';

jest.mock('../src/api/listings', () => ({
  fetchListings: jest.fn().mockResolvedValue({
    data: [{ id: '1', title: 'Mocked' }],
    total: 1,
    page: 1,
    pageSize: 20,
  }),
  fetchListing: jest.fn().mockResolvedValue({ id: '1', title: 'Mocked detail' }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('listing hooks', () => {
  it('useListings returns the paginated payload', async () => {
    const { result } = renderHook(() => useListings({ type: 'rent' }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data[0].title).toBe('Mocked');
  });

  it('useListing fetches a single listing by id', async () => {
    const { result } = renderHook(() => useListing('1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe('Mocked detail');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- listingsHooks`
Expected: FAIL — cannot find module `../src/hooks/listings`.

- [ ] **Step 3: Write the hooks**

`mobile/src/hooks/listings.ts`:
```ts
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  CreateListingInput,
  ListingFilters,
  createListing,
  fetchListing,
  fetchListings,
  fetchMyListings,
  fetchNearby,
  updateListing,
} from '../api/listings';

export const listingKeys = {
  all: ['listings'] as const,
  list: (filters: ListingFilters) => ['listings', 'list', filters] as const,
  nearby: (args: { lat: number; lng: number; radius?: number }) =>
    ['listings', 'nearby', args] as const,
  detail: (id: string) => ['listings', 'detail', id] as const,
  mine: ['listings', 'mine'] as const,
};

export function useListings(filters: ListingFilters) {
  return useQuery({
    queryKey: listingKeys.list(filters),
    queryFn: () => fetchListings(filters),
  });
}

export function useNearbyListings(
  args: { lat: number; lng: number; radius?: number } | null,
) {
  return useQuery({
    queryKey: listingKeys.nearby(args ?? { lat: 0, lng: 0 }),
    queryFn: () => fetchNearby(args as { lat: number; lng: number; radius?: number }),
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
    mutationFn: (input: Partial<CreateListingInput>) => updateListing(id, input),
    onSuccess: (listing) => {
      qc.setQueryData(listingKeys.detail(id), listing);
      qc.invalidateQueries({ queryKey: listingKeys.mine });
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- listingsHooks`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/hooks/listings.ts mobile/__tests__/listingsHooks.test.tsx
git commit -m "feat(mobile): react-query listing hooks"
```

---

## Task 6: Filter store (Zustand) + tests

**Files:**
- Create: `mobile/src/store/filterStore.ts`
- Test: `mobile/__tests__/filterStore.test.ts`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/filterStore.test.ts`:
```ts
import { useFilterStore } from '../src/store/filterStore';

describe('filterStore', () => {
  beforeEach(() => useFilterStore.getState().reset());

  it('defaults to rent with empty amenities', () => {
    const s = useFilterStore.getState();
    expect(s.type).toBe('rent');
    expect(s.amenities).toEqual([]);
    expect(s.sort).toBe('recent');
  });

  it('changes type and toggles amenities idempotently', () => {
    const { setType, toggleAmenity } = useFilterStore.getState();
    setType('shortstay');
    toggleAmenity('wifi');
    toggleAmenity('parking');
    toggleAmenity('wifi'); // remove
    const s = useFilterStore.getState();
    expect(s.type).toBe('shortstay');
    expect(s.amenities).toEqual(['parking']);
  });

  it('builds backend query params and resets', () => {
    const { setType, setPriceRange, setBedrooms, toggleAmenity, toFilters, reset } =
      useFilterStore.getState();
    setType('sale');
    setPriceRange(1_000_000_00, 5_000_000_00);
    setBedrooms(3);
    toggleAmenity('pool');

    expect(useFilterStore.getState().toFilters()).toEqual({
      type: 'sale',
      minPrice: 1_000_000_00,
      maxPrice: 5_000_000_00,
      bedrooms: 3,
      amenities: ['pool'],
      sort: 'recent',
    });

    reset();
    expect(useFilterStore.getState().toFilters()).toEqual({ type: 'rent', sort: 'recent' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- filterStore`
Expected: FAIL — cannot find module `../src/store/filterStore`.

- [ ] **Step 3: Write the store**

`mobile/src/store/filterStore.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- filterStore`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/store/filterStore.ts mobile/__tests__/filterStore.test.ts
git commit -m "feat(mobile): zustand search filter store"
```

---

## Task 7: SegmentedTypePills component

**Files:**
- Create: `mobile/src/components/SegmentedTypePills.tsx`
- Test: `mobile/__tests__/SegmentedTypePills.test.tsx`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/SegmentedTypePills.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SegmentedTypePills } from '../src/components/SegmentedTypePills';

describe('SegmentedTypePills', () => {
  it('renders the three type labels', () => {
    const { getByText } = render(<SegmentedTypePills value="rent" onChange={() => {}} />);
    expect(getByText('Rent')).toBeTruthy();
    expect(getByText('Buy')).toBeTruthy();
    expect(getByText('Short-stay')).toBeTruthy();
  });

  it('emits the mapped listing type on press', () => {
    const onChange = jest.fn();
    const { getByText } = render(<SegmentedTypePills value="rent" onChange={onChange} />);
    fireEvent.press(getByText('Buy'));
    expect(onChange).toHaveBeenCalledWith('sale');
    fireEvent.press(getByText('Short-stay'));
    expect(onChange).toHaveBeenCalledWith('shortstay');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SegmentedTypePills`
Expected: FAIL — cannot find module `../src/components/SegmentedTypePills`.

- [ ] **Step 3: Write the component**

`mobile/src/components/SegmentedTypePills.tsx`:
```tsx
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { ListingType } from '../types/listing';

const OPTIONS: { label: string; value: ListingType }[] = [
  { label: 'Rent', value: 'rent' },
  { label: 'Buy', value: 'sale' },
  { label: 'Short-stay', value: 'shortstay' },
];

interface Props {
  value: ListingType;
  onChange: (type: ListingType) => void;
}

export function SegmentedTypePills({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.pill,
    padding: 4,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
  },
  pillActive: { backgroundColor: theme.colors.primary },
  label: { color: theme.colors.muted, fontWeight: theme.font.weightSemibold, fontSize: theme.font.sizeSm },
  labelActive: { color: theme.colors.white },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- SegmentedTypePills`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/SegmentedTypePills.tsx mobile/__tests__/SegmentedTypePills.test.tsx
git commit -m "feat(mobile): segmented Rent/Buy/Short-stay pills"
```

---

## Task 8: ListingCard component

**Files:**
- Create: `mobile/src/components/PriceText.tsx`
- Create: `mobile/src/components/ListingCard.tsx`
- Test: `mobile/__tests__/ListingCard.test.tsx`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/ListingCard.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ListingCard } from '../src/components/ListingCard';
import { Listing } from '../src/types/listing';

const listing: Listing = {
  id: 'abc',
  ownerId: 'o',
  listingType: 'rent',
  status: 'active',
  title: 'Two-bed flat in Yaba',
  description: 'desc',
  propertyType: 'apartment',
  bedrooms: 2,
  bathrooms: 2,
  areaSqm: null,
  amenities: ['wifi'],
  address: '1 Herbert Macaulay',
  city: 'Lagos',
  state: 'Lagos',
  lat: 6.5,
  lng: 3.37,
  photos: [{ id: 'p1', cloudinaryPublicId: 'x', url: 'https://img/x.jpg', position: 0 }],
  rentDetails: { monthlyRent: 350_000_00, annualRent: null, securityDeposit: null, leaseTermMonths: null, availableFrom: null },
  saleDetails: null,
  shortstayDetails: null,
  createdAt: '',
  updatedAt: '',
};

describe('ListingCard', () => {
  it('shows title, price label, and location', () => {
    const { getByText } = render(<ListingCard listing={listing} onPress={() => {}} />);
    expect(getByText('Two-bed flat in Yaba')).toBeTruthy();
    expect(getByText('₦350,000/mo')).toBeTruthy();
    expect(getByText('Lagos, Lagos')).toBeTruthy();
  });

  it('calls onPress with the listing id', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ListingCard listing={listing} onPress={onPress} />);
    fireEvent.press(getByText('Two-bed flat in Yaba'));
    expect(onPress).toHaveBeenCalledWith('abc');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ListingCard`
Expected: FAIL — cannot find module `../src/components/ListingCard`.

- [ ] **Step 3: Write `PriceText.tsx`**

`mobile/src/components/PriceText.tsx`:
```tsx
import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { theme } from '../theme';
import { priceLabelForListing } from '../lib/format';
import { Listing } from '../types/listing';

export function PriceText({ listing, style }: { listing: Listing; style?: TextStyle }) {
  return <Text style={[styles.price, style]}>{priceLabelForListing(listing)}</Text>;
}

const styles = StyleSheet.create({
  price: { color: theme.colors.primary, fontWeight: theme.font.weightBold, fontSize: theme.font.sizeMd },
});
```

- [ ] **Step 4: Write `ListingCard.tsx`**

`mobile/src/components/ListingCard.tsx`:
```tsx
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { Listing } from '../types/listing';
import { PriceText } from './PriceText';

interface Props {
  listing: Listing;
  onPress: (id: string) => void;
}

export function ListingCard({ listing, onPress }: Props) {
  const cover = listing.photos[0]?.url;
  return (
    <Pressable style={styles.card} onPress={() => onPress(listing.id)} accessibilityRole="button">
      {cover ? (
        <Image source={{ uri: cover }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>No photo</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {listing.city}, {listing.state}
        </Text>
        <View style={styles.metaRow}>
          <PriceText listing={listing} />
          {listing.bedrooms != null && (
            <Text style={styles.meta}>
              {listing.bedrooms} bd · {listing.bathrooms ?? 0} ba
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    overflow: 'hidden',
    marginBottom: theme.spacing(2),
  },
  image: { width: '100%', height: 180, backgroundColor: theme.colors.card },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: theme.colors.muted, fontSize: theme.font.sizeSm },
  body: { padding: theme.spacing(2) },
  title: { fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, color: theme.colors.ink },
  location: { color: theme.colors.muted, fontSize: theme.font.sizeSm, marginTop: 2 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: theme.spacing(1) },
  meta: { color: theme.colors.muted, fontSize: theme.font.sizeSm },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- ListingCard`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/PriceText.tsx mobile/src/components/ListingCard.tsx mobile/__tests__/ListingCard.test.tsx
git commit -m "feat(mobile): reusable ListingCard + PriceText"
```

---

## Task 9: Home feed screen

**Files:**
- Create: `mobile/src/screens/listings/HomeFeedScreen.tsx`

- [ ] **Step 1: Write the Home feed screen**

`mobile/src/screens/listings/HomeFeedScreen.tsx`:
```tsx
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { SegmentedTypePills } from '../../components/SegmentedTypePills';
import { ListingCard } from '../../components/ListingCard';
import { theme } from '../../theme';
import { useFilterStore } from '../../store/filterStore';
import { useListings } from '../../hooks/listings';

export function HomeFeedScreen() {
  const navigation = useNavigation<any>();
  const type = useFilterStore((s) => s.type);
  const setType = useFilterStore((s) => s.setType);
  const setQuery = useFilterStore((s) => s.setQuery);
  const toFilters = useFilterStore((s) => s.toFilters);
  const [text, setText] = React.useState('');

  const { data, isLoading, refetch, isRefetching } = useListings(toFilters());

  const submitSearch = () => {
    setQuery(text);
    navigation.navigate('SearchResults');
  };

  return (
    <Screen>
      <Text style={styles.greeting}>Find your next home</Text>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <AppTextInput
            placeholder="Search city, area, or title"
            value={text}
            onChangeText={setText}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
          />
        </View>
      </View>
      <View style={styles.pills}>
        <SegmentedTypePills value={type} onChange={setType} />
      </View>
      <View style={styles.ctaRow}>
        <Button label="Filters" variant="secondary" onPress={() => navigation.navigate('SearchFilters')} style={styles.cta} />
        <Button label="Map" variant="secondary" onPress={() => navigation.navigate('MapView')} style={styles.cta} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing(4) }} />
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard listing={item} onPress={(id) => navigation.navigate('ListingDetail', { id })} />
          )}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={<Text style={styles.empty}>No listings yet. Try different filters.</Text>}
          contentContainerStyle={{ paddingTop: theme.spacing(2), paddingBottom: theme.spacing(6) }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, color: theme.colors.ink, marginTop: theme.spacing(2) },
  searchRow: { marginTop: theme.spacing(2) },
  searchBox: { borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radii.md, backgroundColor: theme.colors.card },
  pills: { marginTop: theme.spacing(2) },
  ctaRow: { flexDirection: 'row', gap: theme.spacing(1), marginTop: theme.spacing(2) },
  cta: { flex: 1 },
  empty: { textAlign: 'center', color: theme.colors.muted, marginTop: theme.spacing(6) },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/listings/HomeFeedScreen.tsx
git commit -m "feat(mobile): home feed screen with search + type pills"
```

---

## Task 10: Search results + filters bottom sheet

**Files:**
- Create: `mobile/src/screens/listings/SearchResultsScreen.tsx`
- Create: `mobile/src/screens/listings/SearchFiltersSheet.tsx`

- [ ] **Step 1: Write the Search results screen**

`mobile/src/screens/listings/SearchResultsScreen.tsx`:
```tsx
import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { ListingCard } from '../../components/ListingCard';
import { theme } from '../../theme';
import { useFilterStore } from '../../store/filterStore';
import { useListings } from '../../hooks/listings';

export function SearchResultsScreen() {
  const navigation = useNavigation<any>();
  const toFilters = useFilterStore((s) => s.toFilters);
  const [page, setPage] = React.useState(1);
  const filters = { ...toFilters(), page, pageSize: 20 };
  const { data, isLoading, isFetching } = useListings(filters);

  const total = data?.total ?? 0;
  const items = data?.data ?? [];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.count}>{total} results</Text>
        <Button label="Edit filters" variant="secondary" onPress={() => navigation.navigate('SearchFilters')} style={styles.editBtn} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing(4) }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ListingCard listing={item} onPress={(id) => navigation.navigate('ListingDetail', { id })} />
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nothing matches these filters.</Text>}
          ListFooterComponent={
            items.length < total ? (
              <Button
                label={isFetching ? 'Loading…' : 'Load more'}
                variant="secondary"
                onPress={() => setPage((p) => p + 1)}
              />
            ) : null
          }
          contentContainerStyle={{ paddingBottom: theme.spacing(6) }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: theme.spacing(2) },
  count: { fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold, color: theme.colors.ink },
  editBtn: { paddingHorizontal: theme.spacing(2) },
  empty: { textAlign: 'center', color: theme.colors.muted, marginTop: theme.spacing(6) },
});
```

- [ ] **Step 2: Write the Search filters bottom sheet**

`mobile/src/screens/listings/SearchFiltersSheet.tsx` (a Modal-based bottom sheet; no extra native dep):
```tsx
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { SegmentedTypePills } from '../../components/SegmentedTypePills';
import { theme } from '../../theme';
import { useFilterStore } from '../../store/filterStore';

const AMENITIES = ['wifi', 'parking', 'ac', 'pool', 'water', 'security', 'furnished'];

export function SearchFiltersSheet() {
  const navigation = useNavigation<any>();
  const store = useFilterStore();
  const [minText, setMinText] = React.useState(store.minPrice ? String(store.minPrice / 100) : '');
  const [maxText, setMaxText] = React.useState(store.maxPrice ? String(store.maxPrice / 100) : '');

  const apply = () => {
    store.setPriceRange(
      minText ? Number(minText) * 100 : undefined,
      maxText ? Number(maxText) * 100 : undefined,
    );
    navigation.navigate('SearchResults');
  };

  return (
    <Modal animationType="slide" transparent presentationStyle="overFullScreen">
      <Pressable style={styles.backdrop} onPress={() => navigation.goBack()} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Filters</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Type</Text>
          <SegmentedTypePills value={store.type} onChange={store.setType} />

          <Text style={styles.label}>Price (₦)</Text>
          <View style={styles.row}>
            <View style={[styles.input, styles.half]}>
              <AppTextInput placeholder="Min" keyboardType="numeric" value={minText} onChangeText={setMinText} />
            </View>
            <View style={[styles.input, styles.half]}>
              <AppTextInput placeholder="Max" keyboardType="numeric" value={maxText} onChangeText={setMaxText} />
            </View>
          </View>

          <Text style={styles.label}>Bedrooms (min)</Text>
          <View style={styles.chips}>
            {[1, 2, 3, 4].map((n) => (
              <Pressable
                key={n}
                onPress={() => store.setBedrooms(store.bedrooms === n ? undefined : n)}
                style={[styles.chip, store.bedrooms === n && styles.chipActive]}
              >
                <Text style={[styles.chipText, store.bedrooms === n && styles.chipTextActive]}>{n}+</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Amenities</Text>
          <View style={styles.chips}>
            {AMENITIES.map((a) => {
              const active = store.amenities.includes(a);
              return (
                <Pressable key={a} onPress={() => store.toggleAmenity(a)} style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{a}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Button label="Reset" variant="secondary" onPress={store.reset} style={styles.half} />
          <Button label="Apply" onPress={apply} style={styles.half} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: theme.colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: theme.spacing(3), maxHeight: '85%' },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: theme.colors.line, marginBottom: theme.spacing(2) },
  title: { fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold, color: theme.colors.ink, marginBottom: theme.spacing(2) },
  label: { fontWeight: theme.font.weightSemibold, color: theme.colors.ink, marginTop: theme.spacing(2), marginBottom: theme.spacing(1) },
  row: { flexDirection: 'row', gap: theme.spacing(1) },
  input: { borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radii.md, backgroundColor: theme.colors.card },
  half: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(1) },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: theme.radii.pill, backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.line },
  chipActive: { backgroundColor: theme.colors.chip, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.muted, fontSize: theme.font.sizeSm },
  chipTextActive: { color: theme.colors.primary, fontWeight: theme.font.weightSemibold },
  actions: { flexDirection: 'row', gap: theme.spacing(1), marginTop: theme.spacing(2) },
});
```

- [ ] **Step 3: Run the suite (no regressions)**

Run: `npm test`
Expected: PASS — existing unit tests still green (screens are wired/checked in Task 15).

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/listings/SearchResultsScreen.tsx mobile/src/screens/listings/SearchFiltersSheet.tsx
git commit -m "feat(mobile): search results + filters bottom sheet"
```

---

## Task 11: Map view with clustered pins

**Files:**
- Create: `mobile/src/screens/listings/MapViewScreen.tsx`

- [ ] **Step 1: Write the Map view screen**

`mobile/src/screens/listings/MapViewScreen.tsx`:
```tsx
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-map-clustering';
import { Marker, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../theme';
import { useFilterStore } from '../../store/filterStore';
import { useListings } from '../../hooks/listings';
import { priceLabelForListing } from '../../lib/format';

// Default region: Lagos, Nigeria.
const INITIAL_REGION: Region = {
  latitude: 6.5244,
  longitude: 3.3792,
  latitudeDelta: 0.4,
  longitudeDelta: 0.4,
};

export function MapViewScreen() {
  const navigation = useNavigation<any>();
  const toFilters = useFilterStore((s) => s.toFilters);
  const { data, isLoading } = useListings({ ...toFilters(), pageSize: 50 });
  const listings = (data?.data ?? []).filter((l) => l.lat != null && l.lng != null);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        clusterColor={theme.colors.primary}
        clusterTextColor={theme.colors.white}
        showsUserLocation
      >
        {listings.map((listing) => (
          <Marker
            key={listing.id}
            coordinate={{ latitude: listing.lat, longitude: listing.lng }}
            onCalloutPress={() => navigation.navigate('ListingDetail', { id: listing.id })}
          >
            <View style={styles.pin}>
              <Text style={styles.pinText}>{priceLabelForListing(listing)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>
      <Pressable style={styles.listBtn} onPress={() => navigation.navigate('SearchResults')}>
        <Text style={styles.listBtnText}>List view</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.white },
  pin: { backgroundColor: theme.colors.primary, paddingVertical: 6, paddingHorizontal: 10, borderRadius: theme.radii.pill, borderWidth: 1, borderColor: theme.colors.white },
  pinText: { color: theme.colors.white, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightBold },
  listBtn: { position: 'absolute', bottom: theme.spacing(4), alignSelf: 'center', backgroundColor: theme.colors.ink, paddingVertical: 12, paddingHorizontal: 24, borderRadius: theme.radii.pill },
  listBtnText: { color: theme.colors.white, fontWeight: theme.font.weightBold },
});
```

> Note: `react-native-map-clustering` re-exports a `MapView` that wraps `react-native-maps`; `Marker`/`Region` still come from `react-native-maps`. The map renders on a dev build / device; it is not unit-tested here (native module).

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/listings/MapViewScreen.tsx
git commit -m "feat(mobile): map view with clustered price pins"
```

---

## Task 12: Listing detail + photo gallery lightbox

**Files:**
- Create: `mobile/src/screens/listings/ListingDetailScreen.tsx`
- Create: `mobile/src/screens/listings/PhotoGalleryScreen.tsx`

- [ ] **Step 1: Write the Photo gallery / lightbox screen**

`mobile/src/screens/listings/PhotoGalleryScreen.tsx`:
```tsx
import React from 'react';
import { Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../../theme';

const { width } = Dimensions.get('window');

export function PhotoGalleryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { urls, initialIndex } = route.params as { urls: string[]; initialIndex?: number };

  return (
    <View style={styles.container}>
      <FlatList
        data={urls}
        horizontal
        pagingEnabled
        initialScrollIndex={initialIndex ?? 0}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        keyExtractor={(item, i) => `${item}-${i}`}
        renderItem={({ item }) => <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />}
        showsHorizontalScrollIndicator={false}
      />
      <Pressable style={styles.close} onPress={() => navigation.goBack()}>
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  image: { width, height: '100%' },
  close: { position: 'absolute', top: theme.spacing(6), right: theme.spacing(3), backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: theme.radii.pill },
  closeText: { color: theme.colors.white, fontWeight: theme.font.weightBold },
});
```

- [ ] **Step 2: Write the Listing detail screen**

`mobile/src/screens/listings/ListingDetailScreen.tsx`:
```tsx
import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { PriceText } from '../../components/PriceText';
import { theme } from '../../theme';
import { useListing } from '../../hooks/listings';
import { formatNaira } from '../../lib/format';
import { Listing } from '../../types/listing';

function TypeBlock({ listing }: { listing: Listing }) {
  if (listing.listingType === 'rent' && listing.rentDetails) {
    const r = listing.rentDetails;
    return (
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Rental terms</Text>
        {r.securityDeposit != null && <Text style={styles.row}>Deposit: {formatNaira(r.securityDeposit)}</Text>}
        {r.leaseTermMonths != null && <Text style={styles.row}>Lease: {r.leaseTermMonths} months</Text>}
        {r.availableFrom && <Text style={styles.row}>Available from: {new Date(r.availableFrom).toDateString()}</Text>}
      </View>
    );
  }
  if (listing.listingType === 'sale' && listing.saleDetails) {
    const s = listing.saleDetails;
    return (
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Sale details</Text>
        <Text style={styles.row}>Price: {formatNaira(s.salePrice)}</Text>
        <Text style={styles.row}>Negotiable: {s.negotiable ? 'Yes' : 'No'}</Text>
        <Text style={styles.row}>Title docs verified: {s.titleDocsVerified ? 'Yes' : 'No'}</Text>
      </View>
    );
  }
  if (listing.listingType === 'shortstay' && listing.shortstayDetails) {
    const s = listing.shortstayDetails;
    return (
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Short-stay</Text>
        <Text style={styles.row}>Nightly: {formatNaira(s.nightlyRate)}</Text>
        <Text style={styles.row}>Cleaning fee: {formatNaira(s.cleaningFee)}</Text>
        <Text style={styles.row}>Min nights: {s.minNights} · Max guests: {s.maxGuests}</Text>
      </View>
    );
  }
  return null;
}

function ctaLabel(listing: Listing): string {
  switch (listing.listingType) {
    case 'rent': return 'Apply & pay deposit';
    case 'sale': return 'Inquire / schedule inspection';
    case 'shortstay': return 'Check availability & book';
    default: return 'Contact lister';
  }
}

export function ListingDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = route.params as { id: string };
  const { data: listing, isLoading } = useListing(id);

  if (isLoading || !listing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const urls = listing.photos.map((p) => p.url);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Pressable onPress={() => urls.length && navigation.navigate('PhotoGallery', { urls, initialIndex: 0 })}>
          {urls[0] ? (
            <Image source={{ uri: urls[0] }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.placeholder]}>
              <Text style={styles.placeholderText}>No photos</Text>
            </View>
          )}
          {urls.length > 1 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>+{urls.length - 1} photos</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.body}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.location}>{listing.address}, {listing.city}, {listing.state}</Text>
          <PriceText listing={listing} style={{ fontSize: theme.font.sizeLg, marginTop: theme.spacing(1) }} />

          <View style={styles.specRow}>
            {listing.bedrooms != null && <Text style={styles.spec}>{listing.bedrooms} beds</Text>}
            {listing.bathrooms != null && <Text style={styles.spec}>{listing.bathrooms} baths</Text>}
            {listing.areaSqm != null && <Text style={styles.spec}>{listing.areaSqm} m²</Text>}
          </View>

          <Text style={styles.description}>{listing.description}</Text>

          <TypeBlock listing={listing} />

          {listing.amenities.length > 0 && (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Amenities</Text>
              <View style={styles.amenities}>
                {listing.amenities.map((a) => (
                  <View key={a} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.listerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>HB</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.listerName}>Listed by HomeBase host</Text>
              <Text style={styles.listerMeta}>Tap the button below to get in touch</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.ctaBar}>
        <Button label={ctaLabel(listing)} onPress={() => navigation.navigate('ListingDetail', { id })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.white },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.white },
  cover: { width: '100%', height: 280, backgroundColor: theme.colors.card },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: theme.colors.muted },
  badge: { position: 'absolute', bottom: theme.spacing(2), right: theme.spacing(2), backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: theme.radii.pill },
  badgeText: { color: theme.colors.white, fontSize: theme.font.sizeXs },
  body: { padding: theme.spacing(3) },
  title: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, color: theme.colors.ink },
  location: { color: theme.colors.muted, marginTop: 4 },
  specRow: { flexDirection: 'row', gap: theme.spacing(2), marginTop: theme.spacing(2) },
  spec: { color: theme.colors.ink, fontWeight: theme.font.weightSemibold, fontSize: theme.font.sizeSm },
  description: { color: theme.colors.ink, lineHeight: 22, marginTop: theme.spacing(2) },
  block: { marginTop: theme.spacing(3) },
  blockTitle: { fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, color: theme.colors.ink, marginBottom: theme.spacing(1) },
  row: { color: theme.colors.ink, marginTop: 4 },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(1) },
  amenityChip: { backgroundColor: theme.colors.chip, paddingVertical: 6, paddingHorizontal: 12, borderRadius: theme.radii.pill },
  amenityText: { color: theme.colors.primary, fontSize: theme.font.sizeSm },
  listerCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2), marginTop: theme.spacing(3), padding: theme.spacing(2), backgroundColor: theme.colors.card, borderRadius: theme.radii.lg },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.colors.white, fontWeight: theme.font.weightBold },
  listerName: { fontWeight: theme.font.weightBold, color: theme.colors.ink },
  listerMeta: { color: theme.colors.muted, fontSize: theme.font.sizeSm },
  ctaBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: theme.spacing(3), backgroundColor: theme.colors.white, borderTopWidth: 1, borderTopColor: theme.colors.line },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/listings/ListingDetailScreen.tsx mobile/src/screens/listings/PhotoGalleryScreen.tsx
git commit -m "feat(mobile): listing detail + photo lightbox"
```

---

## Task 13: Create listing multi-step flow

**Files:**
- Create: `mobile/src/screens/lister/CreateListingScreen.tsx`

- [ ] **Step 1: Write the multi-step Create listing screen**

`mobile/src/screens/lister/CreateListingScreen.tsx`:
```tsx
import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { SegmentedTypePills } from '../../components/SegmentedTypePills';
import { theme } from '../../theme';
import { ListingType } from '../../types/listing';
import { CreateListingInput, signPhotoUpload, addPhoto } from '../../api/listings';
import { useCreateListing } from '../../hooks/listings';

type Step = 0 | 1 | 2 | 3 | 4;
const STEP_TITLES = ['Type', 'Details', 'Photos', 'Pricing', 'Location'];

export function CreateListingScreen() {
  const navigation = useNavigation<any>();
  const createMutation = useCreateListing();
  const [step, setStep] = React.useState<Step>(0);

  const [type, setType] = React.useState<ListingType>('rent');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [propertyType, setPropertyType] = React.useState('apartment');
  const [bedrooms, setBedrooms] = React.useState('');
  const [bathrooms, setBathrooms] = React.useState('');
  const [city, setCity] = React.useState('');
  const [stateName, setStateName] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [lat, setLat] = React.useState('6.5244');
  const [lng, setLng] = React.useState('3.3792');
  const [price, setPrice] = React.useState('');
  const [localPhotos, setLocalPhotos] = React.useState<string[]>([]);

  const next = () => setStep((s) => Math.min(4, s + 1) as Step);
  const back = () => setStep((s) => Math.max(0, s - 1) as Step);

  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add listing images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setLocalPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  // Upload one local image to Cloudinary using the backend-signed payload,
  // then persist the resulting public_id + url against the listing.
  const uploadPhoto = async (listingId: string, uri: string, position: number) => {
    const sig = await signPhotoUpload(listingId);
    const form = new FormData();
    form.append('file', { uri, type: 'image/jpeg', name: `photo-${position}.jpg` } as any);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });
    const json = (await res.json()) as { public_id: string; secure_url: string };
    await addPhoto(listingId, { cloudinaryPublicId: json.public_id, url: json.secure_url, position });
  };

  const buildInput = (): CreateListingInput => {
    const base: CreateListingInput = {
      listingType: type,
      title,
      description,
      propertyType,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      amenities: [],
      address,
      city,
      state: stateName,
      lat: Number(lat),
      lng: Number(lng),
    };
    const kobo = Number(price) * 100;
    if (type === 'rent') base.rent = { monthlyRent: kobo };
    if (type === 'sale') base.sale = { salePrice: kobo };
    if (type === 'shortstay') base.shortstay = { nightlyRate: kobo };
    return base;
  };

  const submit = async () => {
    try {
      const listing = await createMutation.mutateAsync(buildInput());
      for (let i = 0; i < localPhotos.length; i += 1) {
        await uploadPhoto(listing.id, localPhotos[i], i);
      }
      Alert.alert('Listing created', 'Your listing was saved as a draft.');
      navigation.navigate('MyListings');
    } catch (e) {
      Alert.alert('Could not create listing', 'Please review your inputs and try again.');
    }
  };

  return (
    <Screen>
      <Text style={styles.stepLabel}>
        Step {step + 1} of 5 · {STEP_TITLES[step]}
      </Text>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.spacing(4) }}>
        {step === 0 && (
          <View style={styles.section}>
            <Text style={styles.heading}>What are you listing?</Text>
            <SegmentedTypePills value={type} onChange={setType} />
          </View>
        )}

        {step === 1 && (
          <View style={styles.section}>
            <Field label="Title"><AppTextInput placeholder="e.g. Two-bed flat in Yaba" value={title} onChangeText={setTitle} /></Field>
            <Field label="Description"><AppTextInput placeholder="Describe the property" value={description} onChangeText={setDescription} multiline /></Field>
            <Field label="Property type"><AppTextInput placeholder="apartment, house, duplex…" value={propertyType} onChangeText={setPropertyType} /></Field>
            <View style={styles.row}>
              <Field label="Bedrooms" style={styles.half}><AppTextInput placeholder="0" keyboardType="numeric" value={bedrooms} onChangeText={setBedrooms} /></Field>
              <Field label="Bathrooms" style={styles.half}><AppTextInput placeholder="0" keyboardType="numeric" value={bathrooms} onChangeText={setBathrooms} /></Field>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.heading}>Photos</Text>
            <Button label="Add photos" variant="secondary" onPress={pickPhotos} />
            <View style={styles.thumbs}>
              {localPhotos.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.thumb} />
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.section}>
            <Field label={type === 'shortstay' ? 'Nightly rate (₦)' : type === 'sale' ? 'Sale price (₦)' : 'Monthly rent (₦)'}>
              <AppTextInput placeholder="0" keyboardType="numeric" value={price} onChangeText={setPrice} />
            </Field>
          </View>
        )}

        {step === 4 && (
          <View style={styles.section}>
            <Field label="Address"><AppTextInput placeholder="Street address" value={address} onChangeText={setAddress} /></Field>
            <View style={styles.row}>
              <Field label="City" style={styles.half}><AppTextInput placeholder="City" value={city} onChangeText={setCity} /></Field>
              <Field label="State" style={styles.half}><AppTextInput placeholder="State" value={stateName} onChangeText={setStateName} /></Field>
            </View>
            <View style={styles.row}>
              <Field label="Latitude" style={styles.half}><AppTextInput placeholder="Lat" keyboardType="numeric" value={lat} onChangeText={setLat} /></Field>
              <Field label="Longitude" style={styles.half}><AppTextInput placeholder="Lng" keyboardType="numeric" value={lng} onChangeText={setLng} /></Field>
            </View>
            <Text style={styles.hint}>Drop a pin on the map (lat/lng) so seekers can find this on the map view.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.nav}>
        {step > 0 && <Button label="Back" variant="secondary" onPress={back} style={styles.half} />}
        {step < 4 ? (
          <Button label="Next" onPress={next} style={styles.half} />
        ) : (
          <Button label={createMutation.isPending ? 'Saving…' : 'Create listing'} onPress={submit} style={styles.half} />
        )}
      </View>
    </Screen>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: object }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.input}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepLabel: { color: theme.colors.primary, fontWeight: theme.font.weightSemibold, marginVertical: theme.spacing(2) },
  section: { marginTop: theme.spacing(1) },
  heading: { fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold, color: theme.colors.ink, marginBottom: theme.spacing(2) },
  field: { marginBottom: theme.spacing(2) },
  fieldLabel: { color: theme.colors.ink, fontWeight: theme.font.weightSemibold, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radii.md, backgroundColor: theme.colors.card },
  row: { flexDirection: 'row', gap: theme.spacing(1) },
  half: { flex: 1 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(1), marginTop: theme.spacing(2) },
  thumb: { width: 90, height: 90, borderRadius: theme.radii.md, backgroundColor: theme.colors.card },
  hint: { color: theme.colors.muted, fontSize: theme.font.sizeSm, marginTop: theme.spacing(1) },
  nav: { flexDirection: 'row', gap: theme.spacing(1), paddingVertical: theme.spacing(2) },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/lister/CreateListingScreen.tsx
git commit -m "feat(mobile): multi-step create listing flow with photo upload"
```

---

## Task 14: Edit listing + My listings

**Files:**
- Create: `mobile/src/screens/lister/EditListingScreen.tsx`
- Create: `mobile/src/screens/lister/MyListingsScreen.tsx`

- [ ] **Step 1: Write the My listings screen**

`mobile/src/screens/lister/MyListingsScreen.tsx`:
```tsx
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { PriceText } from '../../components/PriceText';
import { theme } from '../../theme';
import { useMyListings } from '../../hooks/listings';

export function MyListingsScreen() {
  const navigation = useNavigation<any>();
  const { data, isLoading, refetch, isRefetching } = useMyListings();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>My listings</Text>
        <Button label="New" onPress={() => navigation.navigate('CreateListing')} style={styles.newBtn} />
      </View>
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing(4) }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => navigation.navigate('EditListing', { id: item.id })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowMeta}>{item.status.toUpperCase()} · {item.city}</Text>
                <PriceText listing={item} />
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No listings yet. Tap “New” to create one.</Text>}
          contentContainerStyle={{ paddingBottom: theme.spacing(6) }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: theme.spacing(2) },
  title: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, color: theme.colors.ink },
  newBtn: { paddingHorizontal: theme.spacing(3) },
  row: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing(2), backgroundColor: theme.colors.card, borderRadius: theme.radii.lg, marginBottom: theme.spacing(1) },
  rowTitle: { fontWeight: theme.font.weightBold, color: theme.colors.ink },
  rowMeta: { color: theme.colors.muted, fontSize: theme.font.sizeSm, marginVertical: 2 },
  chevron: { fontSize: 28, color: theme.colors.muted },
  empty: { textAlign: 'center', color: theme.colors.muted, marginTop: theme.spacing(6) },
});
```

- [ ] **Step 2: Write the Edit listing screen**

`mobile/src/screens/lister/EditListingScreen.tsx`:
```tsx
import React from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useListing, useUpdateListing } from '../../hooks/listings';

export function EditListingScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { id } = route.params as { id: string };
  const { data: listing, isLoading } = useListing(id);
  const update = useUpdateListing(id);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');

  React.useEffect(() => {
    if (listing) {
      setTitle(listing.title);
      setDescription(listing.description);
    }
  }, [listing]);

  if (isLoading || !listing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  const save = async () => {
    try {
      await update.mutateAsync({ title, description });
      Alert.alert('Saved', 'Your listing was updated.');
      navigation.goBack();
    } catch {
      Alert.alert('Update failed', 'Please try again.');
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: theme.spacing(2) }}>
        <Text style={styles.title}>Edit listing</Text>
        <Text style={styles.label}>Title</Text>
        <View style={styles.input}><AppTextInput value={title} onChangeText={setTitle} placeholder="Title" /></View>
        <Text style={styles.label}>Description</Text>
        <View style={styles.input}><AppTextInput value={description} onChangeText={setDescription} placeholder="Description" multiline /></View>
        <Button label={update.isPending ? 'Saving…' : 'Save changes'} onPress={save} style={{ marginTop: theme.spacing(3) }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.white },
  title: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, color: theme.colors.ink, marginBottom: theme.spacing(2) },
  label: { color: theme.colors.ink, fontWeight: theme.font.weightSemibold, marginTop: theme.spacing(2), marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radii.md, backgroundColor: theme.colors.card },
});
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/lister/MyListingsScreen.tsx mobile/src/screens/lister/EditListingScreen.tsx
git commit -m "feat(mobile): my listings + edit listing screens"
```

---

## Task 15: Navigation wiring + full suite

**Files:**
- Create: `mobile/src/navigation/ListingsStack.tsx`
- Modify: `mobile/src/navigation/MainTabs.tsx`

- [ ] **Step 1: Write the listings stack**

`mobile/src/navigation/ListingsStack.tsx`:
```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeFeedScreen } from '../screens/listings/HomeFeedScreen';
import { SearchResultsScreen } from '../screens/listings/SearchResultsScreen';
import { SearchFiltersSheet } from '../screens/listings/SearchFiltersSheet';
import { MapViewScreen } from '../screens/listings/MapViewScreen';
import { ListingDetailScreen } from '../screens/listings/ListingDetailScreen';
import { PhotoGalleryScreen } from '../screens/listings/PhotoGalleryScreen';

const Stack = createNativeStackNavigator();

export function ListingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeFeed" component={HomeFeedScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="MapView" component={MapViewScreen} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="SearchFilters" component={SearchFiltersSheet} />
        <Stack.Screen name="PhotoGallery" component={PhotoGalleryScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Write a lister stack (Create/Edit/My listings) and add both to tabs**

Add a lister stack inline and register tabs in `mobile/src/navigation/MainTabs.tsx` (keep the Phase 0 Home placeholder removed/replaced):
```tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ListingsStack } from './ListingsStack';
import { MyListingsScreen } from '../screens/lister/MyListingsScreen';
import { CreateListingScreen } from '../screens/lister/CreateListingScreen';
import { EditListingScreen } from '../screens/lister/EditListingScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();
const ListerStackNav = createNativeStackNavigator();

function ListerStack() {
  return (
    <ListerStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ListerStackNav.Screen name="MyListings" component={MyListingsScreen} />
      <ListerStackNav.Screen name="CreateListing" component={CreateListingScreen} />
      <ListerStackNav.Screen name="EditListing" component={EditListingScreen} />
    </ListerStackNav.Navigator>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary }}>
      <Tab.Screen name="Explore" component={ListingsStack} />
      <Tab.Screen name="Listings" component={ListerStack} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all PASS — `smoke`, `theme`, `Button`, `TextInput`, `authStore` (Phase 0) + `format`, `filterStore`, `listingsHooks`, `ListingCard`, `SegmentedTypePills` (Phase 2).

- [ ] **Step 4: Manual smoke check**

Run: `npx expo start` (use a dev build for `react-native-maps`).
Expected: Explore tab → Home feed loads listings, type pills switch, Filters sheet applies, Search results paginate, Map shows clustered pins, Listing detail shows gallery + type block + lister card + CTA. Listings tab → My listings → New → multi-step Create → returns to My listings; Edit saves.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/navigation/ListingsStack.tsx mobile/src/navigation/MainTabs.tsx
git commit -m "feat(mobile): wire listings + lister stacks into main tabs"
```

---

## Self-Review (against spec §5.2 Discovery, §5.5 Lister Tools, §7 Screens, §11 Design System)

- **React Query hooks (useListings, useNearbyListings, useListing, useCreateListing, useUpdateListing, useMyListings):** Task 5. ✓
- **Filter store + filter-state tests:** Task 6. ✓
- **Reusable ListingCard with tests + segmented Rent/Buy/Short-stay pills with tests:** Tasks 7, 8. ✓
- **Home feed, Search filters (bottom sheet), Search results (list):** Tasks 9, 10. ✓
- **Map view via `react-native-maps` (`npx expo install react-native-maps`) with clustered pins:** Tasks 1, 11. ✓
- **Listing detail (gallery + type-specific block + lister card + contextual CTA) + photo lightbox:** Task 12. ✓
- **Lister Create (type → details → photos via `expo-image-picker` → pricing → location pin), Edit, My listings:** Tasks 13, 14. ✓
- **Money in kobo, formatted to ₦ at the edge:** `formatNaira`/`priceLabelForListing` (Task 3), used everywhere prices show. ✓
- **Reuse of Phase 0 primitives/theme/api/queryClient/authStore:** all screens import `Screen`/`Button`/`AppTextInput`/`theme`; data flows through the Phase 0 `api`/`queryClient`. ✓

**Type consistency:** `Listing`/`ListingType`/`Paginated` types, the `listings` API functions, `listingKeys` query keys, `useFilterStore` (with `toFilters()` matching `ListingFilters`), `ListingCard`, `SegmentedTypePills`, and `PriceText` are declared once and reused. Navigation route names (`HomeFeed`, `SearchResults`, `SearchFilters`, `MapView`, `ListingDetail`, `PhotoGallery`, `MyListings`, `CreateListing`, `EditListing`) are referenced consistently between the stacks and the `navigation.navigate(...)` calls.

**No placeholders:** every code step contains complete, runnable code. Native-only surfaces (maps, image picker, Cloudinary upload) are verified by the manual smoke check in Task 15; all pure logic and presentational components are covered by Jest unit tests.
