import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ConversationListing } from '../../api/messaging';
import { formatNaira } from '../../lib/format';
import { RatingBadge } from '../StarRating';
import { theme } from '../../theme';

function priceLabel(listing: ConversationListing): string {
  if (listing.listingType === 'rent') {
    const r = listing.rentDetails;
    if (r?.monthlyRent != null) return `${formatNaira(r.monthlyRent)}/mo`;
    if (r?.annualRent != null) return `${formatNaira(r.annualRent)}/yr`;
  }
  if (listing.listingType === 'sale' && listing.saleDetails) return formatNaira(listing.saleDetails.salePrice);
  if (listing.listingType === 'shortstay' && listing.shortstayDetails) {
    return `${formatNaira(listing.shortstayDetails.nightlyRate)}/night`;
  }
  return 'Price on request';
}

const TYPE_LABELS: Record<string, string> = {
  rent: 'For rent',
  sale: 'For sale',
  shortstay: 'Short-stay',
};

interface Props {
  listing: ConversationListing;
  onPress: () => void;
}

export function ChatListingCard({ listing, onPress }: Props) {
  const photo = listing.photos[0]?.url;
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Ionicons name="home-outline" size={22} color={theme.colors.muted} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.type}>{TYPE_LABELS[listing.listingType] ?? listing.listingType}</Text>
          <RatingBadge average={listing.rating.average} count={listing.rating.count} compact />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {listing.title}
        </Text>
        <Text style={styles.price}>{priceLabel(listing)}</Text>
        <View style={styles.meta}>
          <Ionicons name="bed-outline" size={14} color={theme.colors.muted} />
          <Text style={styles.metaText}>{listing.bedrooms} bed</Text>
          <Ionicons name="water-outline" size={14} color={theme.colors.muted} style={styles.metaIcon} />
          <Text style={styles.metaText}>{listing.bathrooms} bath</Text>
        </View>
        <Text style={styles.location} numberOfLines={1}>
          {listing.address}, {listing.city}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing(2),
    marginBottom: theme.spacing(1.5),
    padding: theme.spacing(1.5),
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...theme.shadow.sm,
  },
  photo: { width: 72, height: 72, borderRadius: theme.radii.md },
  photoPlaceholder: {
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, marginLeft: theme.spacing(1.5), marginRight: theme.spacing(0.5) },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  type: {
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    marginTop: 2,
  },
  price: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.ink,
    marginTop: 2,
  },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaText: { fontSize: theme.font.sizeXs, color: theme.colors.muted, marginLeft: 4 },
  metaIcon: { marginLeft: 10 },
  location: { fontSize: theme.font.sizeXs, color: theme.colors.muted, marginTop: 4 },
});
