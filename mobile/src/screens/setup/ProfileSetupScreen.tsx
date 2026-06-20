import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SetupLayout } from '../../components/SetupLayout';
import { FieldLabel } from '../../components/FieldLabel';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { SelectableChip } from '../../components/SelectableChip';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useSetupCatalog } from '../../lib/catalogApi';
import { updateProfile } from '../../lib/setupApi';
import { getApiErrorMessage } from '../../lib/apiErrors';
import type { SetupStackParamList } from '../../navigation/SetupStack';
import type { Gender } from '../../store/authStore';

type Props = NativeStackScreenProps<SetupStackParamList, 'ProfileSetup'>;

function formatBirthday(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function parseBirthday(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function ProfileSetupScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const { data: catalog, isLoading: catalogLoading, isError: catalogError } = useSetupCatalog();
  const [preferredName, setPreferredName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [birthday, setBirthday] = useState<Date | null>(parseBirthday(user?.dateOfBirth));
  const [gender, setGender] = useState<Gender | null>(user?.gender ?? null);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canContinue = useMemo(() => preferredName.trim().length >= 2 && gender !== null, [preferredName, gender]);

  function onDateChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setBirthday(selected);
  }

  async function submit() {
    setError(null);
    if (!canContinue) return setError('Enter your preferred name and gender to continue');
    setLoading(true);
    try {
      const updated = await updateProfile({
        name: preferredName.trim(),
        phone: phone.trim() || undefined,
        dateOfBirth: birthday ? birthday.toISOString().slice(0, 10) : null,
        gender,
      });
      setUser(updated);
      navigation.navigate('RoleSetup');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (catalogLoading || !catalog) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (catalogError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.error}>Could not load profile options. Check your connection and try again.</Text>
      </View>
    );
  }

  return (
    <SetupLayout
      title="Your HomeBase profile"
      step={1}
      hint="We use your preferred name, age, and gender so HomeBase can personalize listings and messages for you."
      onNext={() => void submit()}
      nextDisabled={!canContinue || loading}
      loading={loading}
    >
      <View style={styles.field}>
        <FieldLabel>What name should we call you?</FieldLabel>
        <InputGroup>
          <AppTextInput
            placeholder="Maya"
            value={preferredName}
            onChangeText={setPreferredName}
            autoComplete="name"
            editable={!loading}
          />
        </InputGroup>
      </View>

      <View style={styles.field}>
        <FieldLabel>Your birthday</FieldLabel>
        <Pressable onPress={() => setShowPicker(true)} accessibilityRole="button">
          <InputGroup>
            <View style={styles.dateRow}>
              <Text style={[styles.dateText, !birthday && styles.placeholder]}>
                {birthday ? formatBirthday(birthday) : 'Select your birthday'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.muted} />
            </View>
          </InputGroup>
        </Pressable>
        {showPicker && (
          <DateTimePicker
            value={birthday ?? new Date(2000, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        )}
        {Platform.OS === 'ios' && showPicker && (
          <Pressable onPress={() => setShowPicker(false)} style={styles.donePicker}>
            <Text style={styles.donePickerText}>Done</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.field}>
        <FieldLabel>Your gender</FieldLabel>
        <View style={styles.genderRow}>
          {catalog.genders.map((g) => (
            <SelectableChip
              key={g.code}
              label={g.label}
              selected={gender === g.code}
              onPress={() => setGender(g.code as Gender)}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <FieldLabel>Phone number (optional)</FieldLabel>
        <InputGroup>
          <AppTextInput
            placeholder="+234 801 234 5678"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            editable={!loading}
          />
        </InputGroup>
      </View>

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
  field: { marginBottom: theme.spacing(2.5) },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  dateText: {
    fontSize: theme.font.sizeMd,
    color: theme.colors.ink,
  },
  placeholder: {
    color: theme.colors.muted,
  },
  donePicker: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  donePickerText: {
    color: theme.colors.primary,
    fontWeight: theme.font.weightBold,
    fontSize: theme.font.sizeSm,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.font.sizeSm,
    marginTop: theme.spacing(1),
  },
});
