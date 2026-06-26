import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FieldLabel } from '../../components/FieldLabel';
import { InputGroup } from '../../components/InputGroup';
import { SelectChip } from '../../components/SelectChip';
import { FormSection } from '../../components/lister/FormSection';
import { ListingStatusBadge } from '../../components/lister/ListingStatusBadge';
import { theme } from '../../theme';
import { useListing, useUpdateListing, useUpdateListingStatus } from '../../hooks/listings';
import { ListingStatus } from '../../types/listing';
import { getApiErrorMessage } from '../../lib/apiErrors';
import { priceLabelForListing } from '../../lib/format';

const STATUSES: { value: ListingStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'draft', label: 'Draft' },
  { value: 'rented', label: 'Rented' },
  { value: 'sold', label: 'Sold' },
];

export function EditListingScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { id } = route.params as { id: string };
  const { data: listing, isLoading } = useListing(id);
  const update = useUpdateListing(id);
  const updateStatus = useUpdateListingStatus(id);

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [bedrooms, setBedrooms] = React.useState('');

  React.useEffect(() => {
    if (listing) {
      setTitle(listing.title);
      setDescription(listing.description);
      setBedrooms(listing.bedrooms != null ? String(listing.bedrooms) : '');
    }
  }, [listing]);

  if (isLoading || !listing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.loaderText}>Loading listing…</Text>
      </View>
    );
  }

  const cover = listing.photos[0]?.url;
  const price = priceLabelForListing(listing);

  const save = async () => {
    if (title.trim().length < 3) {
      Alert.alert('Check your inputs', 'Title must be at least 3 characters.');
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert('Check your inputs', 'Description must be at least 10 characters.');
      return;
    }
    try {
      await update.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
      });
      Alert.alert('Saved', 'Your listing was updated.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Update failed', getApiErrorMessage(e));
    }
  };

  const changeStatus = async (status: ListingStatus) => {
    if (status === listing.status) return;
    try {
      await updateStatus.mutateAsync(status);
      Alert.alert('Status updated', `Listing is now ${status}.`);
    } catch (e) {
      Alert.alert('Could not update status', getApiErrorMessage(e));
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Edit listing" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.summaryCard}>
            {cover ? (
              <Image source={{ uri: cover }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Ionicons name="image-outline" size={28} color={theme.colors.muted} />
              </View>
            )}
            <View style={styles.summaryBody}>
              <View style={styles.summaryTop}>
                <ListingStatusBadge status={listing.status} />
                <Text style={styles.type}>{listing.listingType.replace('shortstay', 'short-stay')}</Text>
              </View>
              <Text style={styles.summaryTitle} numberOfLines={2}>
                {listing.title}
              </Text>
              <View style={styles.locRow}>
                <Ionicons name="location-outline" size={14} color={theme.colors.muted} />
                <Text style={styles.loc} numberOfLines={1}>
                  {listing.city}, {listing.state}
                </Text>
              </View>
              <Text style={styles.price}>{price}</Text>
            </View>
          </View>

          <FormSection title="Listing details" subtitle="Update the information seekers see first.">
            <InputGroup>
              <AppTextInput value={title} onChangeText={setTitle} placeholder="Listing title" />
              <AppTextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Description"
                multiline
                style={styles.multiline}
              />
            </InputGroup>

            <FieldLabel style={styles.fieldGap}>Bedrooms</FieldLabel>
            <View style={styles.inputBox}>
              <AppTextInput
                value={bedrooms}
                onChangeText={setBedrooms}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
          </FormSection>

          <FormSection title="Listing status" subtitle="Control whether seekers can find this property.">
            <View style={styles.chips}>
              {STATUSES.map((s) => (
                <SelectChip
                  key={s.value}
                  label={s.label}
                  active={listing.status === s.value}
                  onPress={() => changeStatus(s.value)}
                />
              ))}
            </View>
          </FormSection>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing(2) }]}>
          <Button
            label={update.isPending ? 'Saving…' : 'Save changes'}
            onPress={save}
            loading={update.isPending}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: theme.spacing(3),
    paddingBottom: theme.spacing(2),
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    gap: theme.spacing(1.5),
  },
  loaderText: { color: theme.colors.muted, fontSize: theme.font.sizeSm },
  summaryCard: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.xl,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
    ...theme.shadow.card,
  },
  cover: {
    width: 96,
    height: 96,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.card,
  },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  summaryBody: { flex: 1, minWidth: 0 },
  summaryTop: {
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
  summaryTitle: {
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    lineHeight: 20,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  loc: { flex: 1, fontSize: theme.font.sizeSm, color: theme.colors.muted },
  price: {
    marginTop: 8,
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightBold,
    color: theme.colors.primary,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  fieldGap: { marginTop: theme.spacing(2) },
  inputBox: {
    marginTop: theme.spacing(0.5),
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.input,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(1) },
  footer: {
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    ...theme.shadow.sm,
  },
});
