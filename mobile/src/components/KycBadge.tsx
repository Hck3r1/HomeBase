import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface Props {
  verified: boolean;
  compact?: boolean;
}

export function KycBadge({ verified, compact }: Props) {
  if (!verified) {
    return (
      <View style={[styles.badge, styles.unverified, compact && styles.compact]}>
        <Ionicons name="shield-outline" size={compact ? 12 : 14} color={theme.colors.muted} />
        <Text style={[styles.text, styles.unverifiedText, compact && styles.compactText]}>Unverified</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, styles.verified, compact && styles.compact]}>
      <Ionicons name="shield-checkmark" size={compact ? 12 : 14} color={theme.colors.primary} />
      <Text style={[styles.text, styles.verifiedText, compact && styles.compactText]}>KYC verified</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
  },
  compact: { paddingHorizontal: 8, paddingVertical: 3 },
  verified: { backgroundColor: theme.colors.primaryLight },
  unverified: { backgroundColor: theme.colors.card },
  text: { fontSize: theme.font.sizeSm, fontWeight: theme.font.weightSemibold },
  compactText: { fontSize: theme.font.sizeXs },
  verifiedText: { color: theme.colors.primary },
  unverifiedText: { color: theme.colors.muted },
});
