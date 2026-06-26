import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserProfile } from '../../api/messaging';
import { KycBadge } from '../KycBadge';
import { theme } from '../../theme';

interface Props {
  counterparty: UserProfile | null;
  onBack: () => void;
  onProfilePress: () => void;
  onRatePress?: () => void;
  showRate?: boolean;
}

export function ChatHeader({ counterparty, onBack, onProfilePress, onRatePress, showRate }: Props) {
  const insets = useSafeAreaInsets();
  const initial = (counterparty?.name ?? '?').charAt(0).toUpperCase();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        <Pressable onPress={onBack} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={theme.colors.ink} />
        </Pressable>
        <Pressable style={styles.center} onPress={onProfilePress}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.name} numberOfLines={1}>
              {counterparty?.name ?? 'Chat'}
            </Text>
            <View style={styles.meta}>
              {counterparty?.listerType ? (
                <Text style={styles.role}>{counterparty.listerType === 'agent' ? 'Agent' : 'Landlord'}</Text>
              ) : null}
              {counterparty ? <KycBadge verified={counterparty.kycVerified} compact /> : null}
            </View>
          </View>
        </Pressable>
        {showRate ? (
          <Pressable onPress={onRatePress} style={styles.rateBtn} accessibilityRole="button" accessibilityLabel="Rate">
            <Ionicons name="star" size={18} color="#F4B400" />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(1),
    paddingBottom: theme.spacing(1.25),
    minHeight: 56,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  rateBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.starLight,
    borderWidth: 1,
    borderColor: 'rgba(244, 180, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: theme.colors.primary, fontWeight: theme.font.weightBold, fontSize: theme.font.sizeMd },
  copy: { flex: 1, marginLeft: theme.spacing(1.25) },
  name: { fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, color: theme.colors.ink },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  role: { fontSize: theme.font.sizeXs, color: theme.colors.muted },
});
