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
    id: '1',
    ownerId: 'o',
    status: 'active' as const,
    title: 't',
    description: 'd',
    propertyType: 'house',
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: null,
    amenities: [],
    address: 'a',
    city: 'Lagos',
    state: 'Lagos',
    lat: 0,
    lng: 0,
    photos: [],
    rentDetails: null,
    saleDetails: null,
    shortstayDetails: null,
    createdAt: '',
    updatedAt: '',
  };

  it('labels rent per month, sale flat, and shortstay per night', () => {
    const rent = {
      ...base,
      listingType: 'rent' as const,
      rentDetails: {
        monthlyRent: 350_000_00,
        annualRent: null,
        securityDeposit: null,
        leaseTermMonths: null,
        availableFrom: null,
      },
    } as Listing;
    const sale = {
      ...base,
      listingType: 'sale' as const,
      saleDetails: { salePrice: 60_000_000_00, negotiable: false, titleDocsVerified: false },
    } as Listing;
    const stay = {
      ...base,
      listingType: 'shortstay' as const,
      shortstayDetails: {
        nightlyRate: 45_000_00,
        cleaningFee: 0,
        minNights: 1,
        maxNights: null,
        maxGuests: 2,
        houseRules: null,
      },
    } as Listing;

    expect(priceLabelForListing(rent)).toBe('₦350,000/mo');
    expect(priceLabelForListing(sale)).toBe('₦60,000,000');
    expect(priceLabelForListing(stay)).toBe('₦45,000/night');
  });
});
