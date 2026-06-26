import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ListingCard } from '../src/components/ListingCard';
import { Listing } from '../src/types/listing';
import { api } from '../src/lib/api';

jest.spyOn(api, 'get').mockResolvedValue({ data: [] } as any);

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['favorites'], []);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

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
  rentDetails: {
    monthlyRent: 350_000_00,
    annualRent: null,
    securityDeposit: null,
    leaseTermMonths: null,
    availableFrom: null,
  },
  saleDetails: null,
  shortstayDetails: null,
  createdAt: '',
  updatedAt: '',
};

describe('ListingCard', () => {
  it('shows title, price label, and location', () => {
    const { getByText } = render(<ListingCard listing={listing} onPress={() => {}} />, { wrapper });
    expect(getByText('Two-bed flat in Yaba')).toBeTruthy();
    expect(getByText('₦350,000/mo')).toBeTruthy();
    expect(getByText('Lagos, Lagos')).toBeTruthy();
  });

  it('calls onPress with the listing id', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ListingCard listing={listing} onPress={onPress} />, { wrapper });
    fireEvent.press(getByText('Two-bed flat in Yaba'));
    expect(onPress).toHaveBeenCalledWith('abc');
  });
});
