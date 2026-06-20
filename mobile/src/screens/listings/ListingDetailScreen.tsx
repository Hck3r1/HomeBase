import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { PriceText } from '../../components/PriceText';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SaveHeartButton } from '../../components/SaveHeartButton';
import { DetailSection } from '../../components/DetailSection';
import { theme } from '../../theme';
import { useListing } from '../../hooks/listings';
import { formatNaira } from '../../lib/format';
import { Listing, ListingType } from '../../types/listing';

const TYPE_LABELS: Record<ListingType, string> = {
  rent: 'For rent',
  sale: 'For sale',
  shortstay: 'Short-stay',
};

function DetailRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={theme.colors.primary} />
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function TypeBlock({ listing }: { listing: Listing }) {
  if (listing.listingType === 'rent' && listing.rentDetails) {
    const r = listing.rentDetails;
    return (
      <DetailSection title="Rental terms">
        {r.securityDeposit != null && (
          <DetailRow icon="shield-checkmark-outline" label="Security deposit" value={formatNaira(r.securityDeposit)} />
        )}
        {r.leaseTermMonths != null && (
          <DetailRow icon="calendar-outline" label="Lease term" value={`${r.leaseTermMonths} months`} />
        )}
        {r.availableFrom && (
          <DetailRow
            icon="time-outline"
            label="Available from"
            value={new Date(r.availableFrom).toLocaleDateString('en-NG', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          />
        )}
      </DetailSection>
    );
  }
  if (listing.listingType === 'sale' && listing.saleDetails) {
    const s = listing.saleDetails;
    return (
      <DetailSection title="Sale details">
        <DetailRow icon="cash-outline" label="Asking price" value={formatNaira(s.salePrice)} />
        <DetailRow icon="chatbubbles-outline" label="Negotiable" value={s.negotiable ? 'Yes' : 'No'} />
        <DetailRow
          icon="document-text-outline"
          label="Title documents"
          value={s.titleDocsVerified ? 'Verified' : 'Not verified'}
        />
      </DetailSection>
    );
  }
  if (listing.listingType === 'shortstay' && listing.shortstayDetails) {
    const s = listing.shortstayDetails;
    return (
      <DetailSection title="Short-stay details">
        <DetailRow icon="moon-outline" label="Nightly rate" value={formatNaira(s.nightlyRate)} />
        <DetailRow icon="sparkles-outline" label="Cleaning fee" value={formatNaira(s.cleaningFee)} />
        <DetailRow
          icon="people-outline"
          label="Stay limits"
          value={`${s.minNights} night min · ${s.maxGuests} guests max`}
        />
      </DetailSection>
    );
  }
  return null;
}

function ctaLabel(listing: Listing): string {
  switch (listing.listingType) {
    case 'rent':
      return 'Apply & pay deposit';
    case 'sale':
      return 'Inquire & schedule viewing';
    case 'shortstay':
      return 'Check availability & book';
    default:
      return 'Contact lister';
  }
}

export function ListingDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { id } = route.params as { id: string };
  const { data: listing, isLoading } = useListing(id);

  if (isLoading || !listing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.loaderText}>Loading listing…</Text>
      </View>
    );
  }

  const urls = listing.photos.map((p) => p.url);
  const owner = listing.owner;
  const initials = owner?.name
    ? owner.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'HB';

  return (
    <View style={styles.container}>
      <ScreenHeader
        transparent
        onBack={() => navigation.goBack()}
        right={<SaveHeartButton listingId={listing.id} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      >
        <Pressable
          onPress={() => urls.length && navigation.navigate('PhotoGallery', { urls, initialIndex: 0 })}
        >
          {urls[0] ? (
            <Image source={{ uri: urls[0] }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.placeholder]}>
              <Ionicons name="image-outline" size={48} color={theme.colors.muted} />
              <Text style={styles.placeholderText}>No photos yet</Text>
            </View>
          )}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{TYPE_LABELS[listing.listingType]}</Text>
          </View>
          {urls.length > 1 && (
            <View style={styles.photoBadge}>
              <Ionicons name="images-outline" size={14} color={theme.colors.white} />
              <Text style={styles.photoBadgeText}>{urls.length} photos</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.body}>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={theme.colors.muted} />
            <Text style={styles.location}>
              {listing.address}, {listing.city}, {listing.state}
            </Text>
          </View>
          <PriceText listing={listing} style={styles.price} />

          <View style={styles.specRow}>
            {listing.bedrooms != null && (
              <View style={styles.specChip}>
                <Ionicons name="bed-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.spec}>{listing.bedrooms} beds</Text>
              </View>
            )}
            {listing.bathrooms != null && (
              <View style={styles.specChip}>
                <Ionicons name="water-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.spec}>{listing.bathrooms} baths</Text>
              </View>
            )}
            {listing.areaSqm != null && (
              <View style={styles.specChip}>
                <Ionicons name="resize-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.spec}>{listing.areaSqm} m²</Text>
              </View>
            )}
            {listing.propertyType ? (
              <View style={styles.specChip}>
                <Ionicons name="home-outline" size={16} color={theme.colors.primary} />
                <Text style={styles.spec}>{listing.propertyType}</Text>
              </View>
            ) : null}
          </View>

          <DetailSection title="About this property">
            <Text style={styles.description}>{listing.description}</Text>
          </DetailSection>

          <TypeBlock listing={listing} />

          {listing.amenities.length > 0 && (
            <DetailSection title="Amenities">
              <View style={styles.amenities}>
                {listing.amenities.map((a) => (
                  <View key={a} style={styles.amenityChip}>
                    <Text style={styles.amenityText}>{a}</Text>
                  </View>
                ))}
              </View>
            </DetailSection>
          )}

          <DetailSection title="Listed by">
            <View style={styles.listerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.listerCopy}>
                <Text style={styles.listerName}>{owner?.name ?? 'HomeBase host'}</Text>
                <Text style={styles.listerMeta}>
                  {owner?.listerType ? `${owner.listerType} · Verified lister` : 'Verified HomeBase lister'}
                </Text>
              </View>
            </View>
          </DetailSection>
        </View>
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + theme.spacing(2) }]}>
        <Button
          label={ctaLabel(listing)}
          onPress={() => Alert.alert('Coming soon', 'Booking and inquiries arrive in Phase 4.')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    gap: theme.spacing(1.5),
  },
  loaderText: { color: theme.colors.muted, fontSize: theme.font.sizeSm },
  cover: { width: '100%', height: 320, backgroundColor: theme.colors.card },
  placeholder: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholderText: { color: theme.colors.muted },
  typeBadge: {
    position: 'absolute',
    top: theme.spacing(2),
    left: theme.spacing(2),
    backgroundColor: 'rgba(21, 32, 29, 0.78)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
  },
  typeBadgeText: {
    color: theme.colors.white,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
  },
  photoBadge: {
    position: 'absolute',
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
  },
  photoBadgeText: { color: theme.colors.white, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightSemibold },
  body: { padding: theme.spacing(3) },
  title: {
    fontSize: theme.font.sizeXl,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: theme.spacing(1),
  },
  location: { flex: 1, color: theme.colors.muted, lineHeight: 20, fontSize: theme.font.sizeSm },
  price: { fontSize: theme.font.sizeLg, marginTop: theme.spacing(1.5) },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(1), marginTop: theme.spacing(2) },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  spec: {
    color: theme.colors.ink,
    fontWeight: theme.font.weightSemibold,
    fontSize: theme.font.sizeSm,
    textTransform: 'capitalize',
  },
  description: { color: theme.colors.ink, lineHeight: 24, fontSize: theme.font.sizeSm },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
  },
  detailCopy: { flex: 1 },
  detailLabel: { fontSize: theme.font.sizeXs, color: theme.colors.muted, fontWeight: theme.font.weightSemibold },
  detailValue: {
    marginTop: 2,
    fontSize: theme.font.sizeSm,
    color: theme.colors.ink,
    fontWeight: theme.font.weightSemibold,
  },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(1) },
  amenityChip: {
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
  },
  amenityText: { color: theme.colors.primary, fontSize: theme.font.sizeSm, textTransform: 'capitalize' },
  listerRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5) },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: theme.colors.white, fontWeight: theme.font.weightBold, fontSize: theme.font.sizeMd },
  listerCopy: { flex: 1 },
  listerName: { fontWeight: theme.font.weightBold, color: theme.colors.ink, fontSize: theme.font.sizeMd },
  listerMeta: { color: theme.colors.muted, fontSize: theme.font.sizeSm, marginTop: 4, textTransform: 'capitalize' },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(2),
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    ...theme.shadow.sm,
  },
});
