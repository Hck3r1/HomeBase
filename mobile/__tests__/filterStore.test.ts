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
    toggleAmenity('wifi');
    const s = useFilterStore.getState();
    expect(s.type).toBe('shortstay');
    expect(s.amenities).toEqual(['parking']);
  });

  it('builds backend query params and resets', () => {
    const { setType, setPriceRange, setBedrooms, toggleAmenity, reset } =
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
