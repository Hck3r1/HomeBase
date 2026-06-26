export interface ResolvedPlace {
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
}

async function loadLocationModule() {
  try {
    return await import('expo-location');
  } catch {
    throw new Error(
      'Location is not available in this build. Stop the app and run: npx expo run:ios --device',
    );
  }
}

export async function getCurrentCoords(): Promise<{ lat: number; lng: number } | null> {
  try {
    const Location = await loadLocationModule();
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return null;
  }
}

export async function getCurrentPlace(): Promise<ResolvedPlace> {
  const Location = await loadLocationModule();

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required to use your current position.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const results = await Location.reverseGeocodeAsync({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });
  const place = results[0];

  const streetParts = [place?.streetNumber, place?.street].filter(Boolean);
  const address =
    streetParts.length > 0 ? streetParts.join(' ') : place?.name ?? place?.district ?? '';

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    address,
    city: place?.city ?? place?.subregion ?? '',
    state: place?.region ?? '',
  };
}
