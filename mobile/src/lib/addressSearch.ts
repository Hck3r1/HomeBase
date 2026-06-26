export interface AddressSuggestion {
  id: string;
  label: string;
  address: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export interface NominatimAddress {
  house_number?: string;
  road?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  region?: string;
}

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export function parseNominatimResult(item: NominatimResult): AddressSuggestion {
  const parts = item.address ?? {};
  const streetParts = [parts.house_number, parts.road].filter(Boolean);
  const address =
    streetParts.length > 0
      ? streetParts.join(' ')
      : item.display_name.split(',')[0]?.trim() ?? item.display_name;
  const city = parts.city ?? parts.town ?? parts.village ?? parts.suburb ?? parts.county ?? '';
  const state = parts.state ?? parts.region ?? '';

  return {
    id: String(item.place_id),
    label: item.display_name,
    address,
    city,
    state,
    lat: Number(item.lat),
    lng: Number(item.lon),
  };
}

export async function searchAddresses(
  query: string,
  context?: { city?: string; state?: string },
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const parts = [trimmed];
  if (context?.city?.trim()) parts.push(context.city.trim());
  if (context?.state?.trim()) parts.push(context.state.trim());
  parts.push('Nigeria');

  const params = new URLSearchParams({
    q: parts.join(', '),
    format: 'json',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'ng',
  });

  const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'HomeBase/1.0 (property listings app)',
    },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as NominatimResult[];
  return data.map(parseNominatimResult);
}
