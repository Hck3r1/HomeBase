import React from 'react';
import {
  Alert,
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FieldLabel } from '../../components/FieldLabel';
import { AddressAutocomplete } from '../../components/AddressAutocomplete';
import { FormSection } from '../../components/lister/FormSection';
import { WizardStepHeader } from '../../components/lister/WizardStepHeader';
import { useToast } from '../../components/Toast';
import { theme } from '../../theme';
import { ListingType } from '../../types/listing';
import { CreateListingInput, signPhotoUpload, addPhoto } from '../../api/listings';
import { useCreateListing } from '../../hooks/listings';
import { getApiErrorMessage } from '../../lib/apiErrors';
import { formatNaira } from '../../lib/format';
import { getCurrentPlace } from '../../lib/location';

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

interface LocalPhoto {
  uri: string;
  mimeType: string;
  fileName: string;
}

export function CreateListingScreen() {
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
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
  const [localPhotos, setLocalPhotos] = React.useState<LocalPhoto[]>([]);
  const [locating, setLocating] = React.useState(false);

  const meta = STEP_META[step];
  const pricePreview =
    price && Number(price) > 0
      ? formatNaira(Math.round(Number(price) * 100))
      : null;

  const showValidationToast = (err: string | null) => {
    if (!err) return false;
    showToast(err);
    return true;
  };

  const formValues = {
    title,
    description,
    propertyType,
    price,
    address,
    city,
    stateName,
    lat,
    lng,
  };

  const next = () => {
    if (showValidationToast(validateStep(step, formValues))) return;
    setStep((s) => Math.min(4, s + 1) as Step);
  };
  const back = () => setStep((s) => Math.max(0, s - 1) as Step);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const place = await getCurrentPlace();
      setLat(String(place.lat));
      setLng(String(place.lng));
      if (place.address) setAddress(place.address);
      if (place.city) setCity(place.city);
      if (place.state) setStateName(place.state);
      setShowCoords(true);
      showToast('Location updated from your current position.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not get your current location.';
      showToast(message);
    } finally {
      setLocating(false);
    }
  };

  const applyAddressSuggestion = (place: {
    address: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
  }) => {
    setAddress(place.address);
    if (place.city) setCity(place.city);
    if (place.state) setStateName(place.state);
    setLat(String(place.lat));
    setLng(String(place.lng));
    setShowCoords(true);
  };

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
        const nextPhotos = [
          ...prev,
          ...result.assets.map((asset, i) => ({
            uri: asset.uri,
            mimeType: asset.mimeType ?? 'image/jpeg',
            fileName: asset.fileName ?? `photo-${Date.now()}-${i}.jpg`,
          })),
        ];
        return nextPhotos.slice(0, 10);
      });
    }
  };

  const removePhoto = (uri: string) => {
    setLocalPhotos((prev) => prev.filter((p) => p.uri !== uri));
  };

  const uploadPhoto = async (listingId: string, photo: LocalPhoto, position: number) => {
    const sig = await signPhotoUpload(listingId);
    if (!sig.apiKey || !sig.cloudName) {
      throw new Error('Photo upload is not configured on the server.');
    }
    const form = new FormData();
    form.append('file', {
      uri: photo.uri,
      type: photo.mimeType,
      name: photo.fileName,
    } as unknown as Blob);
    form.append('api_key', String(sig.apiKey));
    form.append('timestamp', String(sig.timestamp));
    form.append('signature', sig.signature);
    form.append('folder', sig.folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(detail || 'Cloudinary upload failed');
    }
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
    const err =
      validateStep(4, formValues) || validateStep(3, formValues) || validateStep(1, formValues);
    if (showValidationToast(err)) return;
    try {
      const listing = await createMutation.mutateAsync(buildInput());
      let photosUploaded = 0;
      let lastPhotoError: string | null = null;
      for (let i = 0; i < localPhotos.length; i += 1) {
        try {
          await uploadPhoto(listing.id, localPhotos[i], i);
          photosUploaded += 1;
        } catch (e) {
          lastPhotoError = e instanceof Error ? e.message : 'Photo upload failed';
        }
      }
      if (localPhotos.length > 0 && photosUploaded === 0) {
        showToast(
          lastPhotoError?.includes('not configured')
            ? 'Listing saved, but photo upload is not configured on the server.'
            : 'Listing saved, but photos could not be uploaded. Try again from edit listing.',
        );
      } else if (photosUploaded > 0 && photosUploaded < localPhotos.length) {
        showToast(`Listing saved with ${photosUploaded} of ${localPhotos.length} photos.`);
      }
      Alert.alert(
        'Listing created',
        photosUploaded > 0
          ? `Your listing is live with ${photosUploaded} photo${photosUploaded === 1 ? '' : 's'}.`
          : 'Your listing is live.',
      );
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
              <FieldLabel required>Title</FieldLabel>
              <View style={styles.inputBox}>
                <AppTextInput
                  placeholder="e.g. Two-bed flat in Yaba"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <FieldLabel required style={styles.fieldGap}>
                Description
              </FieldLabel>
              <View style={styles.inputBox}>
                <AppTextInput
                  placeholder="Describe the property, neighborhood, and highlights"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  style={styles.multiline}
                />
              </View>

              <FieldLabel required style={styles.fieldGap}>
                Property type
              </FieldLabel>
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
                  {localPhotos.map((photo, index) => (
                    <Pressable key={photo.uri} onPress={() => removePhoto(photo.uri)} style={styles.thumbWrap}>
                      <Image source={{ uri: photo.uri }} style={styles.thumb} />
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
              <FieldLabel required>
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
              <Pressable
                style={[styles.locationBtn, locating && styles.locationBtnDisabled]}
                onPress={useCurrentLocation}
                disabled={locating}
              >
                {locating ? (
                  <ActivityIndicator color={theme.colors.primary} size="small" />
                ) : (
                  <Ionicons name="locate" size={20} color={theme.colors.primary} />
                )}
                <Text style={styles.locationBtnText}>
                  {locating ? 'Getting location…' : 'Use current location'}
                </Text>
              </Pressable>

              <FieldLabel required style={styles.fieldGap}>
                Street address
              </FieldLabel>
              <AddressAutocomplete
                value={address}
                onChangeText={setAddress}
                onSelect={applyAddressSuggestion}
                city={city}
                state={stateName}
              />
              <Text style={styles.hint}>Start typing to see address suggestions.</Text>

              <View style={[styles.row, styles.fieldGap]}>
                <View style={styles.half}>
                  <FieldLabel required>City</FieldLabel>
                  <View style={styles.inputBox}>
                    <AppTextInput placeholder="City" value={city} onChangeText={setCity} />
                  </View>
                </View>
                <View style={styles.half}>
                  <FieldLabel required>State</FieldLabel>
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

        <View style={styles.footer}>
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

interface ListingFormValues {
  title: string;
  description: string;
  propertyType: string;
  price: string;
  address: string;
  city: string;
  stateName: string;
  lat: string;
  lng: string;
}

function validateStep(step: Step, form: ListingFormValues): string | null {
  switch (step) {
    case 1:
      if (form.title.trim().length < 3) return 'Please fill in the title before continuing.';
      if (form.description.trim().length < 10) return 'Please fill in the description before continuing.';
      if (form.propertyType.trim().length < 2) return 'Please select a property type before continuing.';
      return null;
    case 3:
      if (!form.price || Number(form.price) <= 0) return 'Please enter a valid price before continuing.';
      return null;
    case 4:
      if (form.address.trim().length < 3) return 'Please fill in the street address before continuing.';
      if (form.city.trim().length < 2) return 'Please fill in the city before continuing.';
      if (form.stateName.trim().length < 2) return 'Please fill in the state before continuing.';
      if (Number.isNaN(Number(form.lat)) || Number.isNaN(Number(form.lng))) {
        return 'Please enter valid map coordinates.';
      }
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
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(2),
    flexGrow: 1,
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
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.input,
    overflow: 'hidden',
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
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.input,
    paddingLeft: theme.spacing(2),
    overflow: 'hidden',
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
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2),
    borderRadius: theme.radii.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  locationBtnDisabled: { opacity: 0.7 },
  locationBtnText: {
    color: theme.colors.primaryDark,
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightBold,
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(1.5),
    paddingBottom: theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    ...theme.shadow.sm,
  },
  footerBtn: { flex: 1 },
});
