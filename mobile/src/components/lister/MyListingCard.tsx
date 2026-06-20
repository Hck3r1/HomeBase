import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Listing } from '../../types/listing';
import { priceLabelForListing } from '../../lib/format';
import { ListingStatusBadge } from './ListingStatusBadge';

interface Props {
  listing: Listing;
  onPress: () => void;
}

export function MyListingCard({ listing, onPress }: Props) {
  const cover = listing.photos[0]?.url;
  const price = priceLabelForListing(listing);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {cover ? (
        <Image source={{ uri: cover }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="image-outline" size={24} color={theme.colors.muted} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.topRow}>
          <ListingStatusBadge status={listing.status} />
          <Text style={styles.type}>{listing.listingType.replace('shortstay', 'short-stay')}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={theme.colors.muted} />
          <Text style={styles.location} numberOfLines={1}>
            {listing.city}, {listing.state}
          </Text>
        </View>
        <Text style={styles.price}>{price}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.xl,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
    gap: theme.spacing(1.5),
    ...theme.shadow.card,
  },
  pressed: { opacity: 0.96, transform: [{ scale: 0.995 }] },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.card,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  type: {
    fontSize: theme.font.sizeXs,
    color: theme.colors.muted,
    fontWeight: theme.font.weightSemibold,
    textTransform: 'capitalize',
  },
  title: {
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  location: {
    flex: 1,
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
  },
  price: {
    marginTop: 8,
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightBold,
    color: theme.colors.primary,
  },
  chevron: { marginRight: 4 },
});
