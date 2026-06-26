import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Listing, ListingType } from '../types/listing';
import { PriceText } from './PriceText';
import { FavoriteButton } from './FavoriteButton';

interface Props {
  listing: Listing;
  onPress: (id: string) => void;
}

const TYPE_LABELS: Record<ListingType, string> = {
  rent: 'For rent',
  sale: 'For sale',
  shortstay: 'Short-stay',
};

export function ListingCard({ listing, onPress }: Props) {
  const cover = listing.photos[0]?.url;
  const open = () => onPress(listing.id);

  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        <Pressable
          style={({ pressed }) => [styles.imagePress, pressed && styles.cardPressed]}
          onPress={open}
          accessibilityRole="button"
        >
          {cover ? (
            <Image source={{ uri: cover }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholder]}>
              <Ionicons name="image-outline" size={32} color={theme.colors.muted} />
            </View>
          )}
        </Pressable>
        <View style={styles.saveWrap}>
          <FavoriteButton listingId={listing.id} size={20} />
        </View>
        <View style={styles.typeBadge} pointerEvents="none">
          <Text style={styles.typeBadgeText}>{TYPE_LABELS[listing.listingType]}</Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.body, pressed && styles.cardPressed]}
        onPress={open}
        accessibilityRole="button"
      >
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={theme.colors.muted} />
          <Text style={styles.location} numberOfLines={1}>
            {listing.city}, {listing.state}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <PriceText listing={listing} />
          {listing.bedrooms != null && (
            <View style={styles.specs}>
              <Text style={styles.meta}>
                {listing.bedrooms} bd · {listing.bathrooms ?? 0} ba
              </Text>
            </View>
          )}
        </View>
        {listing.propertyType ? (
          <Text style={styles.propertyType}>{listing.propertyType}</Text>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.xl,
    overflow: 'hidden',
    marginBottom: theme.spacing(2.5),
    ...theme.shadow.card,
  },
  cardPressed: { opacity: 0.96, transform: [{ scale: 0.995 }] },
  imageWrap: { position: 'relative' },
  imagePress: { width: '100%' },
  saveWrap: { position: 'absolute', top: theme.spacing(1.5), right: theme.spacing(1.5), zIndex: 2 },
  image: { width: '100%', height: 200, backgroundColor: theme.colors.card },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  typeBadge: {
    position: 'absolute',
    top: theme.spacing(1.5),
    left: theme.spacing(1.5),
    backgroundColor: 'rgba(21, 32, 29, 0.72)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radii.pill,
  },
  typeBadgeText: {
    color: theme.colors.white,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
  },
  body: { padding: theme.spacing(2) },
  title: {
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  location: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: theme.font.sizeSm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing(1.5),
  },
  specs: {
    backgroundColor: theme.colors.card,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radii.pill,
  },
  meta: { color: theme.colors.ink, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightSemibold },
  propertyType: {
    marginTop: theme.spacing(1),
    color: theme.colors.primary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    textTransform: 'capitalize',
  },
});
