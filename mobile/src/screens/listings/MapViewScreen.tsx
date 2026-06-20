import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView from 'react-native-map-clustering';
import { Marker, Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { useFilterStore } from '../../store/filterStore';
import { useListings } from '../../hooks/listings';
import { priceLabelForListing } from '../../lib/format';
import { navigateHomeStack } from '../../navigation/homeStackNavigation';

const INITIAL_REGION: Region = {
  latitude: 6.5244,
  longitude: 3.3792,
  latitudeDelta: 0.4,
  longitudeDelta: 0.4,
};

export function MapViewScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const type = useFilterStore((s) => s.type);
  const q = useFilterStore((s) => s.q);
  const filters = useMemo(() => ({ ...useFilterStore.getState().toFilters(), pageSize: 50 }), [type, q]);
  const { data, isLoading } = useListings(filters);
  const listings = (data?.data ?? []).filter((l) => l.lat != null && l.lng != null);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.loaderText}>Loading map…</Text>
      </View>
    );
  }

  const openDetail = (id: string) => {
    navigateHomeStack(navigation, 'ListingDetail', { id });
  };

  const openList = () => {
    navigateHomeStack(navigation, 'SearchResults');
  };

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        clusterColor={theme.colors.primary}
        clusterTextColor={theme.colors.white}
      >
        {listings.map((listing) => (
          <Marker
            key={listing.id}
            coordinate={{ latitude: listing.lat, longitude: listing.lng }}
            onPress={() => openDetail(listing.id)}
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
          <Text style={styles.topLabel}>{listings.length} on map</Text>
        </View>
        <View style={styles.typeChip}>
          <Text style={styles.typeText}>{type.replace('shortstay', 'short-stay')}</Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.listBtn, { bottom: insets.bottom + 88 }, pressed && styles.listBtnPressed]}
        onPress={openList}
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
  typeChip: {
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
    ...theme.shadow.sm,
  },
  typeText: {
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.primary,
    textTransform: 'capitalize',
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
