import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-map-clustering';
import { Marker, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SegmentedTypePills } from '../../components/SegmentedTypePills';
import { theme } from '../../theme';
import { useFilterStore } from '../../store/filterStore';
import { useListings, useNearbyListings } from '../../hooks/listings';
import { priceLabelForListing } from '../../lib/format';
import { navigateHomeStack } from '../../navigation/homeStackNavigation';
import { getCurrentCoords } from '../../lib/location';
import { Listing } from '../../types/listing';

const FALLBACK_CENTER = { lat: 6.5244, lng: 3.3792 };
const NEARBY_RADIUS_METERS = 50_000;

function regionForCenter(lat: number, lng: number, delta = 0.35): Region {
  return { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta };
}

function withCoords(listings: Listing[]) {
  return listings.filter((l) => l.lat != null && l.lng != null);
}

function centerOfListings(listings: { lat: number; lng: number }[]) {
  if (listings.length === 0) return FALLBACK_CENTER;
  const lat = listings.reduce((sum, l) => sum + l.lat, 0) / listings.length;
  const lng = listings.reduce((sum, l) => sum + l.lng, 0) / listings.length;
  return { lat, lng };
}

export function MapViewScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const type = useFilterStore((s) => s.type);
  const setType = useFilterStore((s) => s.setType);
  const mapRef = React.useRef<MapView>(null);
  const [searchCenter, setSearchCenter] = React.useState<typeof FALLBACK_CENTER | null>(null);
  const [locating, setLocating] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const coords = await getCurrentCoords();
      if (active) setSearchCenter(coords ?? FALLBACK_CENTER);
      setLocating(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const {
    data: nearbyData,
    isLoading: nearbyLoading,
    isSuccess: nearbyReady,
  } = useNearbyListings(
    searchCenter
      ? { lat: searchCenter.lat, lng: searchCenter.lng, radius: NEARBY_RADIUS_METERS, type }
      : null,
  );
  const nearbyListings = withCoords(nearbyData ?? []);
  const useFallback = nearbyReady && nearbyListings.length === 0;

  const { data: allData, isLoading: allLoading } = useListings(
    { type, page: 1, pageSize: 50 },
    { enabled: useFallback },
  );
  const allListings = withCoords(allData?.data ?? []);

  const listings = nearbyListings.length > 0 ? nearbyListings : allListings;
  const showingAll = useFallback && allListings.length > 0;
  const mapCenter =
    nearbyListings.length > 0
      ? (searchCenter ?? FALLBACK_CENTER)
      : centerOfListings(listings);

  const focusListings = React.useCallback(() => {
    if (listings.length === 0) return;
    if (listings.length === 1) {
      mapRef.current?.animateToRegion(
        regionForCenter(listings[0].lat, listings[0].lng, 0.06),
        500,
      );
      return;
    }
    mapRef.current?.fitToCoordinates(
      listings.map((l) => ({ latitude: l.lat, longitude: l.lng })),
      {
        edgePadding: { top: 160, right: 48, bottom: 200, left: 48 },
        animated: true,
      },
    );
  }, [listings]);

  React.useEffect(() => {
    focusListings();
  }, [focusListings]);

  const goToMyLocation = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentCoords();
      if (coords) {
        setSearchCenter(coords);
        mapRef.current?.animateToRegion(regionForCenter(coords.lat, coords.lng, 0.08), 500);
      }
    } finally {
      setLocating(false);
    }
  };

  const isLoading = locating || !searchCenter || nearbyLoading || (useFallback && allLoading);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.loaderText}>Loading map…</Text>
      </View>
    );
  }

  const countLabel = showingAll
    ? `${listings.length} ${listings.length === 1 ? 'listing' : 'listings'} (all)`
    : `${listings.length} nearby`;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={regionForCenter(
          mapCenter.lat,
          mapCenter.lng,
          listings.length === 1 ? 0.06 : nearbyListings.length > 0 ? 0.35 : 4,
        )}
        clusterColor={theme.colors.primary}
        clusterTextColor={theme.colors.white}
      >
        {listings.map((listing) => (
          <Marker
            key={listing.id}
            coordinate={{ latitude: listing.lat, longitude: listing.lng }}
            onPress={() => navigateHomeStack(navigation, 'ListingDetail', { id: listing.id })}
          >
            <View style={styles.pin}>
              <Text style={styles.pinText}>{priceLabelForListing(listing)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <View style={styles.countChip}>
          <Ionicons name="location" size={14} color={theme.colors.primary} />
          <Text style={styles.topLabel}>{countLabel}</Text>
        </View>
        <Pressable style={styles.locateBtn} onPress={goToMyLocation} disabled={locating}>
          {locating ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Ionicons name="locate" size={18} color={theme.colors.primary} />
          )}
        </Pressable>
      </View>

      <View style={[styles.typeBar, { top: insets.top + 64 }]}>
        <SegmentedTypePills value={type} onChange={setType} />
      </View>

      {showingAll ? (
        <View style={[styles.fallbackBanner, { top: insets.top + 120 }]}>
          <Text style={styles.fallbackText}>No listings nearby — showing all available</Text>
        </View>
      ) : null}

      {listings.length === 0 ? (
        <View style={[styles.emptyBanner, { top: insets.top + showingAll ? 160 : 120 }]}>
          <Text style={styles.emptyText}>No {type} listings on the map yet.</Text>
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.listBtn, { bottom: insets.bottom + 88 }, pressed && styles.listBtnPressed]}
        onPress={() => navigateHomeStack(navigation, 'SearchResults')}
      >
        <Ionicons name="list-outline" size={18} color={theme.colors.white} />
        <Text style={styles.listBtnText}>List view</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    gap: theme.spacing(1.5),
  },
  loaderText: { color: theme.colors.muted, fontSize: theme.font.sizeSm },
  topBar: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.white,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radii.pill,
    ...theme.shadow.card,
  },
  topLabel: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.ink,
  },
  typeBar: {
    position: 'absolute',
    left: theme.spacing(2),
    right: theme.spacing(2),
  },
  fallbackBanner: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radii.pill,
    ...theme.shadow.sm,
  },
  fallbackText: {
    color: theme.colors.primaryDark,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
  },
  emptyBanner: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: theme.colors.white,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radii.pill,
    ...theme.shadow.sm,
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
  },
  locateBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  pin: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radii.pill,
    borderWidth: 2,
    borderColor: theme.colors.white,
    ...theme.shadow.sm,
  },
  pinText: {
    color: theme.colors.white,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightBold,
  },
  listBtn: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.ink,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: theme.radii.pill,
    ...theme.shadow.card,
  },
  listBtnPressed: { opacity: 0.92 },
  listBtnText: { color: theme.colors.white, fontWeight: theme.font.weightBold },
});
