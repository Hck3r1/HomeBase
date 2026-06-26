import { parseNominatimResult } from '../src/lib/addressSearch';

describe('parseNominatimResult', () => {
  it('maps street, city, state, and coordinates from nominatim payload', () => {
    const result = parseNominatimResult({
      place_id: 42,
      display_name: '15 Admiralty Way, Lekki, Lagos, Nigeria',
      lat: '6.4474',
      lon: '3.4738',
      address: {
        house_number: '15',
        road: 'Admiralty Way',
        suburb: 'Lekki',
        city: 'Lagos',
        state: 'Lagos',
      },
    });

    expect(result).toEqual({
      id: '42',
      label: '15 Admiralty Way, Lekki, Lagos, Nigeria',
      address: '15 Admiralty Way',
      city: 'Lagos',
      state: 'Lagos',
      lat: 6.4474,
      lng: 3.4738,
    });
  });
});
