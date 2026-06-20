import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SetupLayout } from '../../components/SetupLayout';
import { SegmentedToggle } from '../../components/SegmentedToggle';
import { SelectableChip } from '../../components/SelectableChip';
import { FieldLabel } from '../../components/FieldLabel';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { updateRole } from '../../lib/setupApi';
import { getApiErrorMessage } from '../../lib/apiErrors';
import type { SetupStackParamList } from '../../navigation/SetupStack';

type Props = NativeStackScreenProps<SetupStackParamList, 'RoleSetup'>;

export function RoleSetupScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [role, setRole] = useState<'seeker' | 'lister'>(user?.role ?? 'seeker');
  const [listerType, setListerType] = useState<'agent' | 'landlord'>(user?.listerType ?? 'agent');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const updated = await updateRole(role, role === 'lister' ? listerType : undefined);
      setUser(updated);
      navigation.navigate('PreferencesSetup');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SetupLayout
      title="How will you use HomeBase?"
      step={2}
      hint="Your role shapes what you see first — seekers browse and book; listers manage properties and receive payouts after verification."
      onBack={() => navigation.goBack()}
      onNext={() => void submit()}
      loading={loading}
    >
      <Text style={styles.prompt}>Choose the experience that fits you best.</Text>

      <SegmentedToggle
        options={[
          { value: 'seeker' as const, label: 'Find a place' },
          { value: 'lister' as const, label: 'List properties' },
        ]}
        value={role}
        onChange={setRole}
      />

      <View style={styles.card}>
        {role === 'seeker' ? (
          <>
            <Text style={styles.cardTitle}>Seeker</Text>
            <Text style={styles.cardBody}>
              Browse rentals, homes for sale, and short stays. Save favorites, message listers, book
              stays, and apply for leases.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>Lister</Text>
            <Text style={styles.cardBody}>
              Post and manage listings, handle inquiries, and receive payouts. Verified identity is
              required before your first payout.
            </Text>
          </>
        )}
      </View>

      {role === 'lister' && (
        <View style={styles.listerBlock}>
          <FieldLabel>What type of lister are you?</FieldLabel>
          <View style={styles.listerRow}>
            <SelectableChip
              label="Agent"
              selected={listerType === 'agent'}
              onPress={() => setListerType('agent')}
            />
            <SelectableChip
              label="Landlord"
              selected={listerType === 'landlord'}
              onPress={() => setListerType('landlord')}
            />
          </View>
          <Text style={styles.listerHint}>
            {listerType === 'agent'
              ? 'Verified agents get a badge on listings and can manage multiple properties.'
              : 'Individual landlords list properties they own or manage directly.'}
          </Text>
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SetupLayout>
  );
}

const styles = StyleSheet.create({
  prompt: {
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    marginBottom: theme.spacing(2),
    lineHeight: 20,
  },
  card: {
    marginTop: theme.spacing(2.5),
    padding: theme.spacing(2),
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.card,
  },
  cardTitle: {
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    marginBottom: 6,
  },
  cardBody: {
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  listerBlock: {
    marginTop: theme.spacing(2.5),
  },
  listerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  listerHint: {
    marginTop: theme.spacing(1.5),
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
