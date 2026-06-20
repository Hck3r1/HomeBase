import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SetupLayout } from '../../components/SetupLayout';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { completeSetup } from '../../lib/setupApi';
import { getApiErrorMessage } from '../../lib/apiErrors';
import type { SetupStackParamList } from '../../navigation/SetupStack';

type Props = NativeStackScreenProps<SetupStackParamList, 'KycIntro'>;

const KYC_STEPS = [
  { icon: 'card-outline' as const, title: 'Government ID', body: 'NIN, passport, or driver’s license via Dojah.' },
  { icon: 'shield-checkmark-outline' as const, title: 'BVN verification', body: 'Confirms your identity for secure payouts.' },
  { icon: 'wallet-outline' as const, title: 'Payout account', body: 'Add a bank account after verification to receive earnings.' },
];

export function KycIntroScreen({ navigation }: Props) {
  const setUser = useAuthStore((s) => s.setUser);
  const listerType = useAuthStore((s) => s.user?.listerType);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function finish(skipKyc: boolean) {
    setError(null);
    setLoading(true);
    try {
      const completed = await completeSetup();
      setUser(completed);
      if (!skipKyc) {
        // Full Dojah flow lands in Phase 6 — placeholder for now.
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SetupLayout
      title="Verify your identity"
      step={3}
      totalSteps={3}
      hint={`As a ${listerType === 'agent' ? 'verified agent' : 'landlord'}, identity verification unlocks payouts and builds trust with seekers.`}
      onBack={() => navigation.goBack()}
      onNext={() => void finish(false)}
      nextLabel="Verify now"
      loading={loading}
    >
      <Text style={styles.lead}>
        HomeBase uses Dojah to verify listers before releasing escrow payouts. You can start listing
        now and verify when you are ready to receive funds.
      </Text>

      <View style={styles.steps}>
        {KYC_STEPS.map((step) => (
          <View key={step.title} style={styles.stepRow}>
            <View style={styles.stepIcon}>
              <Ionicons name={step.icon} size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepBody}>{step.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <Button
        label="Skip for now"
        variant="secondary"
        onPress={() => void finish(true)}
        disabled={loading}
        style={styles.skip}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SetupLayout>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    lineHeight: 22,
    marginBottom: theme.spacing(2.5),
  },
  steps: {
    gap: theme.spacing(2),
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCopy: { flex: 1 },
  stepTitle: {
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.ink,
    marginBottom: 4,
  },
  stepBody: {
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  skip: {
    marginTop: theme.spacing(3),
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.font.sizeSm,
    marginTop: theme.spacing(1),
  },
});
