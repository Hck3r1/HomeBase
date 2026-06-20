import React from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FieldLabel } from '../../components/FieldLabel';
import { InputGroup } from '../../components/InputGroup';
import { FormSection } from '../../components/lister/FormSection';
import { WizardStepHeader } from '../../components/lister/WizardStepHeader';
import { theme } from '../../theme';
import { ListingType } from '../../types/listing';
import { CreateListingInput, signPhotoUpload, addPhoto } from '../../api/listings';
import { useCreateListing } from '../../hooks/listings';
import { getApiErrorMessage } from '../../lib/apiErrors';
import { formatNaira } from '../../lib/format';

type Step = 0 | 1 | 2 | 3 | 4;

const STEP_META: { title: string; subtitle: string }[] = [
  {
    title: 'Listing type',
    subtitle: 'Choose how seekers will discover your property.',
  },
  {
    title: 'Property details',
    subtitle: 'Give your listing a clear title and description.',
  },
  {
    title: 'Photos',
    subtitle: 'Great photos help your listing stand out. The first image is the cover.',
  },
  {
    title: 'Pricing',
    subtitle: 'Set a competitive price in Naira.',
  },
  {
    title: 'Location',
    subtitle: 'Where is the property? This places it on the map.',
  },
];

const TYPE_OPTIONS: {
  value: ListingType;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { value: 'rent', label: 'For rent', description: 'Long-term monthly or annual lease', icon: 'key-outline' },
  { value: 'sale', label: 'For sale', description: 'One-time property purchase', icon: 'home-outline' },
  {
    value: 'shortstay',
    label: 'Short-stay',
    description: 'Nightly bookings for travelers',
    icon: 'calendar-outline',
  },
];

const PROPERTY_TYPES = ['apartment', 'house', 'duplex', 'studio', 'land'];

export function CreateListingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const createMutation = useCreateListing();
  const [step, setStep] = React.useState<Step>(0);
  const [showCoords, setShowCoords] = React.useState(false);

  const [type, setType] = React.useState<ListingType>('rent');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [propertyType, setPropertyType] = React.useState('apartment');
  const [bedrooms, setBedrooms] = React.useState('2');
  const [bathrooms, setBathrooms] = React.useState('1');
  const [city, setCity] = React.useState('Lagos');
  const [stateName, setStateName] = React.useState('Lagos');
  const [address, setAddress] = React.useState('');
  const [lat, setLat] = React.useState('6.5244');
  const [lng, setLng] = React.useState('3.3792');
  const [price, setPrice] = React.useState('');
  const [localPhotos, setLocalPhotos] = React.useState<string[]>([]);

  const meta = STEP_META[step];
  const pricePreview =
    price && Number(price) > 0
      ? formatNaira(Math.round(Number(price) * 100))
      : null;

  const next = () => {
    const err = validateStep(step);
    if (err) {
      Alert.alert('Check your inputs', err);
      return;
    }
    setStep((s) => Math.min(4, s + 1) as Step);
  };
  const back = () => setStep((s) => Math.max(0, s - 1) as Step);

  const pickPhotos = async () => {
    if (localPhotos.length >= 10) {
      Alert.alert('Photo limit', 'You can add up to 10 photos.');
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add listing images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setLocalPhotos((prev) => {
        const nextPhotos = [...prev, ...result.assets.map((a) => a.uri)];
        return nextPhotos.slice(0, 10);
      });
    }
  };

  const removePhoto = (uri: string) => {
    setLocalPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const uploadPhoto = async (listingId: string, uri: string, position: number) => {
    const sig = await signPhotoUpload(listingId);
    if (!sig.apiKey || !sig.cloudName) {
      throw new Error('Photo upload is not configured on the server.');
    }
    const form = new FormData();
    form.append('file', { uri, type: 'image/jpeg', name: `photo-${position}.jpg` } as unknown as Blob);
    form.append('api_key', sig.apiKey);
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error('Cloudinary upload failed');
    const json = (await res.json()) as { public_id: string; secure_url: string };
    await addPhoto(listingId, { cloudinaryPublicId: json.public_id, url: json.secure_url, position });
  };

  const buildInput = (): CreateListingInput => {
    const kobo = Math.round(Number(price) * 100);
    const base: CreateListingInput = {
      listingType: type,
      title: title.trim(),
      description: description.trim(),
      propertyType: propertyType.trim(),
      bedrooms: bedrooms ? Number(bedrooms) : 0,
      bathrooms: bathrooms ? Number(bathrooms) : 0,
      amenities: [],
      address: address.trim(),
      city: city.trim(),
      state: stateName.trim(),
      lat: Number(lat),
      lng: Number(lng),
    };
    if (type === 'rent') base.rent = { monthlyRent: kobo, leaseTermMonths: 12 };
    if (type === 'sale') base.sale = { salePrice: kobo };
    if (type === 'shortstay') base.shortstay = { nightlyRate: kobo, minNights: 1, maxGuests: 2 };
    return base;
  };

  const submit = async () => {
    const err = validateStep(4) || validateStep(3) || validateStep(1);
    if (err) {
      Alert.alert('Check your inputs', err);
      return;
    }
    try {
      const listing = await createMutation.mutateAsync(buildInput());
      let photosUploaded = 0;
      for (let i = 0; i < localPhotos.length; i += 1) {
        try {
          await uploadPhoto(listing.id, localPhotos[i], i);
          photosUploaded += 1;
        } catch {
          // Continue if Cloudinary isn't configured
        }
      }
      const photoNote =
        localPhotos.length > 0 && photosUploaded === 0
          ? ' Listing saved, but photos could not be uploaded (check Cloudinary config).'
          : '';
      Alert.alert('Listing created', `Your listing is live.${photoNote}`);
      navigation.navigate('MyListings');
    } catch (e) {
      Alert.alert('Could not create listing', getApiErrorMessage(e));
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="New listing" onBack={() => navigation.goBack()} />
      <WizardStepHeader
        step={step + 1}
        total={5}
        title={meta.title}
        subtitle={meta.subtitle}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && (
            <View style={styles.typeList}>
              {TYPE_OPTIONS.map((opt) => {
                const active = type === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setType(opt.value)}
                    style={[styles.typeCard, active && styles.typeCardActive]}
                  >
                    <View style={[styles.typeIcon, active && styles.typeIconActive]}>
                      <Ionicons
                        name={opt.icon}
                        size={22}
                        color={active ? theme.colors.white : theme.colors.primary}
                      />
                    </View>
                    <View style={styles.typeCopy}>
                      <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{opt.label}</Text>
                      <Text style={styles.typeDesc}>{opt.description}</Text>
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}

          {step === 1 && (
            <FormSection>
              <InputGroup>
                <AppTextInput
                  placeholder="e.g. Two-bed flat in Yaba"
                  value={title}
                  onChangeText={setTitle}
                />
                <AppTextInput
                  placeholder="Describe the property, neighborhood, and highlights"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  style={styles.multiline}
                />
              </InputGroup>

              <FieldLabel style={styles.fieldGap}>Property type</FieldLabel>
              <View style={styles.chips}>
                {PROPERTY_TYPES.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPropertyType(p)}
                    style={[styles.chip, propertyType === p && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, propertyType === p && styles.chipTextActive]}>
                      {p}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.row}>
                <View style={styles.half}>
                  <FieldLabel>Bedrooms</FieldLabel>
                  <View style={styles.inputBox}>
                    <AppTextInput
                      placeholder="0"
                      keyboardType="numeric"
                      value={bedrooms}
                      onChangeText={setBedrooms}
                    />
                  </View>
                </View>
                <View style={styles.half}>
                  <FieldLabel>Bathrooms</FieldLabel>
                  <View style={styles.inputBox}>
                    <AppTextInput
                      placeholder="0"
                      keyboardType="numeric"
                      value={bathrooms}
                      onChangeText={setBathrooms}
                    />
                  </View>
                </View>
              </View>
            </FormSection>
          )}

          {step === 2 && (
            <FormSection>
              <Pressable style={styles.uploadZone} onPress={pickPhotos}>
                <View style={styles.uploadIcon}>
                  <Ionicons name="cloud-upload-outline" size={26} color={theme.colors.primary} />
                </View>
                <Text style={styles.uploadTitle}>Tap to add photos</Text>
                <Text style={styles.uploadHint}>
                  {localPhotos.length}/10 added · JPG or PNG
                </Text>
              </Pressable>

              {localPhotos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoRow}
                >
                  {localPhotos.map((uri, index) => (
                    <Pressable key={uri} onPress={() => removePhoto(uri)} style={styles.thumbWrap}>
                      <Image source={{ uri }} style={styles.thumb} />
                      {index === 0 ? (
                        <View style={styles.coverBadge}>
                          <Text style={styles.coverText}>Cover</Text>
                        </View>
                      ) : null}
                      <View style={styles.removeBadge}>
                        <Ionicons name="close" size={14} color={theme.colors.white} />
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : null}
            </FormSection>
          )}

          {step === 3 && (
            <FormSection>
              <FieldLabel>
                {type === 'shortstay'
                  ? 'Nightly rate (₦)'
                  : type === 'sale'
                    ? 'Sale price (₦)'
                    : 'Monthly rent (₦)'}
              </FieldLabel>
              <View style={styles.priceBox}>
                <Text style={styles.currency}>₦</Text>
                <AppTextInput
                  placeholder="350,000"
                  keyboardType="numeric"
                  value={price}
                  onChangeText={setPrice}
                  style={styles.priceInput}
                />
              </View>
              {pricePreview ? (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Preview</Text>
                  <Text style={styles.previewValue}>
                    {pricePreview}
                    {type === 'shortstay' ? '/night' : type === 'rent' ? '/mo' : ''}
                  </Text>
                </View>
              ) : (
                <Text style={styles.hint}>Enter the amount in Naira (not kobo).</Text>
              )}
            </FormSection>
          )}

          {step === 4 && (
            <FormSection>
              <FieldLabel>Street address</FieldLabel>
              <View style={styles.inputBox}>
                <AppTextInput placeholder="Full street address" value={address} onChangeText={setAddress} />
              </View>

              <View style={[styles.row, styles.fieldGap]}>
                <View style={styles.half}>
                  <FieldLabel>City</FieldLabel>
                  <View style={styles.inputBox}>
                    <AppTextInput placeholder="City" value={city} onChangeText={setCity} />
                  </View>
                </View>
                <View style={styles.half}>
                  <FieldLabel>State</FieldLabel>
                  <View style={styles.inputBox}>
                    <AppTextInput placeholder="State" value={stateName} onChangeText={setStateName} />
                  </View>
                </View>
              </View>

              <Pressable style={styles.advancedToggle} onPress={() => setShowCoords((v) => !v)}>
                <Text style={styles.advancedLabel}>Map coordinates</Text>
                <Ionicons
                  name={showCoords ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={theme.colors.muted}
                />
              </Pressable>

              {showCoords ? (
                <>
                  <View style={styles.row}>
                    <View style={styles.half}>
                      <FieldLabel>Latitude</FieldLabel>
                      <View style={styles.inputBox}>
                        <AppTextInput
                          placeholder="6.5244"
                          keyboardType="numeric"
                          value={lat}
                          onChangeText={setLat}
                        />
                      </View>
                    </View>
                    <View style={styles.half}>
                      <FieldLabel>Longitude</FieldLabel>
                      <View style={styles.inputBox}>
                        <AppTextInput
                          placeholder="3.3792"
                          keyboardType="numeric"
                          value={lng}
                          onChangeText={setLng}
                        />
                      </View>
                    </View>
                  </View>
                  <Text style={styles.hint}>
                    Copy coordinates from Google Maps if needed. Defaults to Lagos.
                  </Text>
                </>
              ) : (
                <Text style={styles.hint}>
                  Using Lagos coordinates by default. Expand to adjust the map pin.
                </Text>
              )}
            </FormSection>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing(2) }]}>
          {step > 0 ? (
            <Button label="Back" variant="secondary" onPress={back} style={styles.footerBtn} />
          ) : (
            <View style={styles.footerBtn} />
          )}
          {step < 4 ? (
            <Button label="Continue" onPress={next} style={styles.footerBtn} />
          ) : (
            <Button
              label={createMutation.isPending ? 'Publishing…' : 'Publish listing'}
              onPress={submit}
              loading={createMutation.isPending}
              style={styles.footerBtn}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function validateStep(step: Step): string | null {
  switch (step) {
    case 1:
      if (title.trim().length < 3) return 'Title must be at least 3 characters.';
      if (description.trim().length < 10) return 'Description must be at least 10 characters.';
      if (propertyType.trim().length < 2) return 'Pick a property type.';
      return null;
    case 3:
      if (!price || Number(price) <= 0) return 'Enter a valid price in Naira.';
      return null;
    case 4:
      if (address.trim().length < 3) return 'Enter a full street address.';
      if (city.trim().length < 2) return 'Enter a city.';
      if (stateName.trim().length < 2) return 'Enter a state.';
      if (Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) return 'Enter valid coordinates.';
      return null;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: theme.spacing(3),
    paddingBottom: theme.spacing(2),
  },
  typeList: { gap: theme.spacing(1.5) },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.xl,
    padding: theme.spacing(2),
    borderWidth: 1.5,
    borderColor: theme.colors.line,
    ...theme.shadow.sm,
  },
  typeCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconActive: { backgroundColor: theme.colors.primary },
  typeCopy: { flex: 1 },
  typeLabel: {
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
  },
  typeLabelActive: { color: theme.colors.primaryDark },
  typeDesc: {
    marginTop: 2,
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    lineHeight: 18,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  fieldGap: { marginTop: theme.spacing(2) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(1), marginTop: theme.spacing(1) },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  chipActive: { backgroundColor: theme.colors.chip, borderColor: theme.colors.primary },
  chipText: { color: theme.colors.muted, fontSize: theme.font.sizeSm, textTransform: 'capitalize' },
  chipTextActive: { color: theme.colors.primary, fontWeight: theme.font.weightSemibold },
  row: { flexDirection: 'row', gap: theme.spacing(1.5) },
  half: { flex: 1 },
  inputBox: {
    marginTop: theme.spacing(0.5),
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
  },
  uploadZone: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    borderRadius: theme.radii.xl,
    paddingVertical: theme.spacing(4),
    paddingHorizontal: theme.spacing(2),
    backgroundColor: theme.colors.primaryLight,
  },
  uploadIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(1.5),
    ...theme.shadow.sm,
  },
  uploadTitle: {
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
  },
  uploadHint: {
    marginTop: 4,
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
  },
  photoRow: { gap: theme.spacing(1.5), marginTop: theme.spacing(2), paddingRight: theme.spacing(1) },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 108,
    height: 108,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.card,
  },
  coverBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(21, 32, 29, 0.78)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radii.pill,
  },
  coverText: {
    color: theme.colors.white,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
  },
  removeBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing(0.5),
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    paddingLeft: theme.spacing(2),
  },
  currency: {
    fontSize: theme.font.sizeLg,
    fontWeight: theme.font.weightBold,
    color: theme.colors.primary,
  },
  priceInput: { flex: 1, fontSize: theme.font.sizeLg, fontWeight: theme.font.weightSemibold },
  previewRow: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primaryLight,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: { color: theme.colors.muted, fontSize: theme.font.sizeSm },
  previewValue: {
    color: theme.colors.primaryDark,
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightBold,
  },
  advancedToggle: {
    marginTop: theme.spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing(1),
  },
  advancedLabel: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.ink,
  },
  hint: {
    marginTop: theme.spacing(1),
    color: theme.colors.muted,
    fontSize: theme.font.sizeSm,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    ...theme.shadow.sm,
  },
  footerBtn: { flex: 1 },
});
