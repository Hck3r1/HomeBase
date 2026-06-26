import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useListings, useListing, useNearbyListings } from '../src/hooks/listings';

jest.mock('../src/api/listings', () => ({
  fetchListings: jest.fn().mockResolvedValue({
    data: [{ id: '1', title: 'Mocked' }],
    total: 1,
    page: 1,
    pageSize: 20,
  }),
  fetchListing: jest.fn().mockResolvedValue({ id: '1', title: 'Mocked detail' }),
  fetchNearby: jest.fn().mockResolvedValue([
    { id: '2', title: 'Nearby flat', listingType: 'rent', lat: 6.5, lng: 3.4, distanceMeters: 900 },
  ]),
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

  it('useNearbyListings fetches geo-ranked listings', async () => {
    const { result } = renderHook(
      () => useNearbyListings({ lat: 6.5244, lng: 3.3792, radius: 50_000, type: 'rent' }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].title).toBe('Nearby flat');
    expect(result.current.data?.[0].distanceMeters).toBe(900);
  });
});
