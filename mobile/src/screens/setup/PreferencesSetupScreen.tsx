import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SetupLayout } from '../../components/SetupLayout';
import { FieldLabel } from '../../components/FieldLabel';
import { SelectableChip } from '../../components/SelectableChip';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { theme } from '../../theme';
import { useAuthStore, type ListingInterest } from '../../store/authStore';
import { useSetupCatalog } from '../../lib/catalogApi';
import { completeSetup, updatePreferences } from '../../lib/setupApi';
import { getApiErrorMessage } from '../../lib/apiErrors';
import type { SetupStackParamList } from '../../navigation/SetupStack';

type Props = NativeStackScreenProps<SetupStackParamList, 'PreferencesSetup'>;

function toggleInterest(current: ListingInterest[], value: ListingInterest): ListingInterest[] {
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
}

export function PreferencesSetupScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const isLister = user?.role === 'lister';
  const { data: catalog, isLoading: catalogLoading, isError: catalogError } = useSetupCatalog();

  const [listingTypes, setListingTypes] = useState<ListingInterest[]>([]);
  const [budgetMin, setBudgetMin] = useState<number | null>(null);
  const [budgetMax, setBudgetMax] = useState<number | null>(null);
  const [preferredCity, setPreferredCity] = useState<string | null>(null);
  const [bedroomsMin, setBedroomsMin] = useState<number | null>(null);
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [customCity, setCustomCity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!catalog || initialized) return;
    const defaults = isLister ? catalog.defaults.lister : catalog.defaults.seeker;
    const saved = user?.preferences;

    setListingTypes(saved?.listingTypes?.length ? saved.listingTypes : defaults.listingTypes);
    setBudgetMin(saved?.budgetMin ?? defaults.budgetMin);
    setBudgetMax(saved?.budgetMax ?? defaults.budgetMax);
    setPreferredCity(saved?.preferredCity ?? defaults.preferredCity);
    setBedroomsMin(saved?.bedroomsMin ?? defaults.bedroomsMin);
    setServiceAreas(saved?.serviceAreas?.length ? saved.serviceAreas : defaults.serviceAreas);
    setInitialized(true);
  }, [catalog, initialized, isLister, user?.preferences]);

  const budgetPresets = isLister ? catalog?.listerPricePresets ?? [] : catalog?.seekerBudgetPresets ?? [];
  const canContinue = useMemo(() => listingTypes.length > 0, [listingTypes]);

  function selectBudget(min: number | null, max: number | null) {
    setBudgetMin(min);
    setBudgetMax(max);
  }

  function toggleCity(cityLabel: string) {
    if (isLister) {
      setServiceAreas((areas) =>
        areas.includes(cityLabel) ? areas.filter((c) => c !== cityLabel) : [...areas, cityLabel],
      );
      return;
    }
    setPreferredCity(cityLabel);
  }

  async function submit() {
    setError(null);
    if (!canContinue) return setError('Select at least one listing type');
    setLoading(true);
    try {
      const city = customCity.trim() || preferredCity || catalog?.cities[0]?.label || 'Lagos';
      const updated = await updatePreferences({
        listingTypes,
        budgetMin,
        budgetMax,
        preferredCity: isLister ? null : city,
        bedroomsMin: isLister ? null : bedroomsMin,
        serviceAreas: isLister ? (serviceAreas.length ? serviceAreas : [city]) : [],
      });
      setUser(updated);
      if (isLister) {
        navigation.navigate('KycIntro');
      } else {
        const completed = await completeSetup();
        setUser(completed);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (catalogLoading || !catalog || !initialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading preferences…</Text>
      </View>
    );
  }

  if (catalogError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.error}>Could not load setup options. Check your connection and try again.</Text>
      </View>
    );
  }

  return (
    <SetupLayout
      title={isLister ? 'Your listing preferences' : 'Your search preferences'}
      step={3}
      hint={
        isLister
          ? 'These defaults speed up creating your first listing. You can change them any time.'
          : 'We use your budget and location to rank listings that match how you want to live.'
      }
      onBack={() => navigation.goBack()}
      onNext={() => void submit()}
      nextDisabled={!canContinue || loading}
      loading={loading}
      nextLabel={isLister ? 'Continue' : 'Finish setup'}
    >
      <View style={styles.field}>
        <FieldLabel>{isLister ? 'What will you list?' : 'What are you looking for?'}</FieldLabel>
        <View style={styles.chipRow}>
          {catalog.listingTypes.map((opt) => (
            <SelectableChip
              key={opt.code}
              label={opt.label}
              selected={listingTypes.includes(opt.code as ListingInterest)}
              onPress={() => setListingTypes((prev) => toggleInterest(prev, opt.code as ListingInterest))}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <FieldLabel>{isLister ? 'Typical price range' : 'Monthly budget'}</FieldLabel>
        <View style={styles.wrapRow}>
          {budgetPresets.map((preset) => {
            const active = budgetMin === preset.minValue && budgetMax === preset.maxValue;
            return (
              <SelectableChip
                key={preset.code}
                compact
                label={preset.label}
                selected={active}
                onPress={() => selectBudget(preset.minValue, preset.maxValue)}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.field}>
        <FieldLabel>{isLister ? 'Service areas' : 'Preferred city'}</FieldLabel>
        <View style={styles.wrapRow}>
          {catalog.cities.map((city) => {
            const active = isLister ? serviceAreas.includes(city.label) : preferredCity === city.label;
            return (
              <SelectableChip
                key={city.code}
                compact
                label={city.label}
                selected={active}
                onPress={() => toggleCity(city.label)}
              />
            );
          })}
        </View>
        <View style={styles.customCity}>
          <InputGroup>
            <AppTextInput
              placeholder="Other city"
              value={customCity}
              onChangeText={setCustomCity}
              editable={!loading}
            />
          </InputGroup>
        </View>
      </View>

      {!isLister && (
        <View style={styles.field}>
          <FieldLabel>Minimum bedrooms</FieldLabel>
          <View style={styles.bedRow}>
            {catalog.bedroomOptions.map((opt) => {
              const count = opt.minValue ?? Number(opt.code);
              return (
                <Pressable
                  key={opt.code}
                  accessibilityRole="button"
                  onPress={() => setBedroomsMin(count)}
                  style={[styles.bedChip, bedroomsMin === count && styles.bedChipActive]}
                >
                  <Text style={[styles.bedLabel, bedroomsMin === count && styles.bedLabelActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {isLister && (
        <View style={styles.kycCard}>
          <Text style={styles.kycTitle}>Identity verification required to list</Text>
          <Text style={styles.kycBody}>
            Agents and landlords must complete KYC with a government ID and BVN before publishing
            listings and receiving payouts. Verification will be enforced once Dojah is live — you can
            start on the next screen or finish later from Settings.
          </Text>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SetupLayout>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing(3),
  },
  loadingText: {
    marginTop: theme.spacing(2),
    color: theme.colors.muted,
    fontSize: theme.font.sizeSm,
  },
  field: { marginBottom: theme.spacing(2.5) },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  customCity: {
    marginTop: theme.spacing(1.5),
  },
  bedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bedChip: {
    width: 48,
    height: 44,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bedChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.chip,
  },
  bedLabel: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.ink,
  },
  bedLabelActive: {
    color: theme.colors.primary,
  },
  kycCard: {
    padding: theme.spacing(2),
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.chip,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  kycTitle: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    marginBottom: 6,
  },
  kycBody: {
    fontSize: theme.font.sizeXs,
    color: theme.colors.muted,
    lineHeight: 18,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.font.sizeSm,
    marginTop: theme.spacing(1),
  },
});
