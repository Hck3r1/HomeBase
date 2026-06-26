import React from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { FavoriteButton } from '../../components/FavoriteButton';
import { DetailSection } from '../../components/DetailSection';
import { ListingPhotoCarousel } from '../../components/listings/ListingPhotoCarousel';
import { theme } from '../../theme';
import { useListing } from '../../hooks/listings';
import { useStartConversation } from '../../api/messaging';
import { navigateHomeStack } from '../../navigation/homeStackNavigation';
import { formatNaira } from '../../lib/format';
import { Listing, ListingType } from '../../types/listing';

const TYPE_LABELS: Record<ListingType, string> = {
  rent: 'For rent',
  sale: 'For sale',
  shortstay: 'Short-stay',
};

function SpecTile({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.specTile}>
      <View style={styles.specIconWrap}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <Text style={styles.specValue}>{value}</Text>
      <Text style={styles.specLabel}>{label}</Text>
    </View>
  );
}

function TermRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.termRow}>
      <View style={styles.termIcon}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
      </View>
      <View style={styles.termCopy}>
        <Text style={styles.termLabel}>{label}</Text>
        <Text style={styles.termValue}>{value}</Text>
      </View>
    </View>
  );
}

function TypeBlock({ listing }: { listing: Listing }) {
  if (listing.listingType === 'rent' && listing.rentDetails) {
    const r = listing.rentDetails;
    return (
      <DetailSection title="Rental terms">
        <View style={styles.termList}>
          {r.securityDeposit != null && (
            <TermRow icon="shield-checkmark-outline" label="Security deposit" value={formatNaira(r.securityDeposit)} />
          )}
          {r.leaseTermMonths != null && (
            <TermRow icon="calendar-outline" label="Lease term" value={`${r.leaseTermMonths} months`} />
          )}
          {r.availableFrom && (
            <TermRow
              icon="time-outline"
              label="Available from"
              value={new Date(r.availableFrom).toLocaleDateString('en-NG', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            />
          )}
        </View>
      </DetailSection>
    );
  }
  if (listing.listingType === 'sale' && listing.saleDetails) {
    const s = listing.saleDetails;
    return (
      <DetailSection title="Sale details">
        <View style={styles.termList}>
          <TermRow icon="cash-outline" label="Asking price" value={formatNaira(s.salePrice)} />
          <TermRow icon="chatbubbles-outline" label="Negotiable" value={s.negotiable ? 'Yes' : 'No'} />
          <TermRow
            icon="document-text-outline"
            label="Title documents"
            value={s.titleDocsVerified ? 'Verified' : 'Not verified'}
          />
        </View>
      </DetailSection>
    );
  }
  if (listing.listingType === 'shortstay' && listing.shortstayDetails) {
    const s = listing.shortstayDetails;
    return (
      <DetailSection title="Short-stay details">
        <View style={styles.termList}>
          <TermRow icon="moon-outline" label="Nightly rate" value={formatNaira(s.nightlyRate)} />
          <TermRow icon="sparkles-outline" label="Cleaning fee" value={formatNaira(s.cleaningFee)} />
          <TermRow
            icon="people-outline"
            label="Stay limits"
            value={`${s.minNights} night min · ${s.maxGuests} guests max`}
          />
        </View>
      </DetailSection>
    );
  }
  return null;
}

function ctaLabel(listing: Listing): string {
  switch (listing.listingType) {
    case 'rent':
      return 'Message lister';
    case 'sale':
      return 'Schedule viewing';
    case 'shortstay':
      return 'Check availability';
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
  const startChat = useStartConversation();

  const handleInquire = () => {
    startChat.mutate(listing!.id, {
      onSuccess: (c) => navigateHomeStack(navigation, 'Chat', { conversationId: c.id, title: c.listing.title }),
      onError: () => Alert.alert('Unable to start chat', 'Please try again in a moment.'),
    });
  };

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

  const ctaBarHeight = theme.spacing(2) + 56 + Math.max(insets.bottom, theme.spacing(2));

  const specs: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }[] = [];
  if (listing.bedrooms != null) specs.push({ icon: 'bed-outline', label: 'Bedrooms', value: String(listing.bedrooms) });
  if (listing.bathrooms != null) specs.push({ icon: 'water-outline', label: 'Bathrooms', value: String(listing.bathrooms) });
  if (listing.areaSqm != null) specs.push({ icon: 'resize-outline', label: 'Area', value: `${listing.areaSqm} m²` });
  if (listing.propertyType) {
    specs.push({
      icon: 'home-outline',
      label: 'Type',
      value: listing.propertyType.charAt(0).toUpperCase() + listing.propertyType.slice(1),
    });
  }

  return (
    <View style={styles.container}>
      <ScreenHeader transparent onBack={() => navigation.goBack()} right={<FavoriteButton listingId={listing.id} />} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: ctaBarHeight }}
      >
        <ListingPhotoCarousel
          urls={urls}
          onPress={(i) => navigation.navigate('PhotoGallery', { urls, initialIndex: i })}
        />

        <View style={styles.summaryCard}>
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{TYPE_LABELS[listing.listingType]}</Text>
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={15} color={theme.colors.primary} />
            <Text style={styles.location}>
              {listing.address}, {listing.city}, {listing.state}
            </Text>
          </View>
          <PriceText listing={listing} style={styles.price} />
        </View>

        {specs.length > 0 ? (
          <View style={styles.specGrid}>
            {specs.map((s) => (
              <SpecTile key={s.label} icon={s.icon} label={s.label} value={s.value} />
            ))}
          </View>
        ) : null}

        <View style={styles.sections}>
          <DetailSection title="About this property">
            <Text style={styles.description}>{listing.description}</Text>
          </DetailSection>

          <TypeBlock listing={listing} />

          {listing.amenities.length > 0 && (
            <DetailSection title="What this place offers">
              <View style={styles.amenities}>
                {listing.amenities.map((a) => (
                  <View key={a} style={styles.amenityRow}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                    <Text style={styles.amenityText}>{a}</Text>
                  </View>
                ))}
              </View>
            </DetailSection>
          )}

          <DetailSection title="Listed by">
            <View style={styles.listerCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.listerCopy}>
                <Text style={styles.listerName}>{owner?.name ?? 'HomeBase host'}</Text>
                <Text style={styles.listerMeta}>
                  {owner?.listerType === 'agent'
                    ? 'Licensed agent'
                    : owner?.listerType === 'landlord'
                      ? 'Property landlord'
                      : 'HomeBase lister'}
                </Text>
              </View>
              <Pressable style={styles.listerChat} onPress={handleInquire} accessibilityRole="button">
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.primary} />
              </Pressable>
            </View>
          </DetailSection>
        </View>
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, theme.spacing(2)) }]}>
        <View style={styles.ctaPrice}>
          <Text style={styles.ctaPriceLabel}>Listed at</Text>
          <PriceText listing={listing} style={styles.ctaPriceValue} />
        </View>
        <Button
          label={startChat.isPending ? 'Opening…' : ctaLabel(listing)}
          onPress={handleInquire}
          disabled={startChat.isPending}
          style={styles.ctaButton}
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
  summaryCard: {
    marginTop: -theme.spacing(3),
    marginHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.xl,
    padding: theme.spacing(2.5),
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...theme.shadow.card,
  },
  typePill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radii.pill,
    marginBottom: theme.spacing(1),
  },
  typePillText: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: theme.font.sizeXl,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: theme.spacing(1.25),
  },
  location: { flex: 1, color: theme.colors.muted, lineHeight: 20, fontSize: theme.font.sizeSm },
  price: { fontSize: theme.font.size2xl, marginTop: theme.spacing(1.5), letterSpacing: -0.5 },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(1.5),
    marginHorizontal: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  specTile: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing(1.75),
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...theme.shadow.sm,
  },
  specIconWrap: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(1),
  },
  specValue: {
    fontSize: theme.font.sizeLg,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
  },
  specLabel: {
    marginTop: 2,
    fontSize: theme.font.sizeXs,
    color: theme.colors.muted,
    fontWeight: theme.font.weightSemibold,
  },
  sections: {
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(2),
  },
  description: {
    color: theme.colors.ink,
    lineHeight: 24,
    fontSize: theme.font.sizeMd,
  },
  termList: { gap: theme.spacing(1.25) },
  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.25),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: theme.spacing(1.25),
  },
  termIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termCopy: { flex: 1 },
  termLabel: { fontSize: theme.font.sizeXs, color: theme.colors.muted, fontWeight: theme.font.weightSemibold },
  termValue: {
    marginTop: 2,
    fontSize: theme.font.sizeSm,
    color: theme.colors.ink,
    fontWeight: theme.font.weightBold,
  },
  amenities: { gap: theme.spacing(1.25) },
  amenityRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.25) },
  amenityText: {
    flex: 1,
    color: theme.colors.ink,
    fontSize: theme.font.sizeSm,
    textTransform: 'capitalize',
  },
  listerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing(1.5),
  },
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
  listerMeta: { color: theme.colors.muted, fontSize: theme.font.sizeSm, marginTop: 4 },
  listerChat: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
    paddingHorizontal: theme.spacing(2.5),
    paddingTop: theme.spacing(1.75),
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    ...theme.shadow.sm,
  },
  ctaPrice: { minWidth: 100 },
  ctaPriceLabel: {
    fontSize: theme.font.sizeXs,
    color: theme.colors.muted,
    fontWeight: theme.font.weightSemibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  ctaPriceValue: { fontSize: theme.font.sizeMd, marginTop: 2 },
  ctaButton: { flex: 1, paddingVertical: 14 },
});
