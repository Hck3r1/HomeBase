import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserProfile } from '../../api/messaging';
import { KycBadge } from '../KycBadge';
import { RatingSummaryCard } from '../StarRating';
import { theme } from '../../theme';

interface Props {
  visible: boolean;
  profile: UserProfile | null;
  onClose: () => void;
}

const LISTER_LABELS = { agent: 'Licensed agent', landlord: 'Landlord' } as const;

export function ListerProfileSheet({ visible, profile, onClose }: Props) {
  const insets = useSafeAreaInsets();
  if (!profile) return null;

  const roleLabel =
    profile.listerType != null ? LISTER_LABELS[profile.listerType] : profile.role === 'lister' ? 'Lister' : 'Seeker';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing(2) }]}>
        <View style={styles.handle} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.role}>{roleLabel}</Text>
            <KycBadge verified={profile.kycVerified} />
            <RatingSummaryCard average={profile.rating.average} count={profile.rating.count} title="Lister rating" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.row}>
              <Ionicons name="call-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.rowText}>{profile.phone ?? 'Phone not shared'}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identity</Text>
            <View style={styles.row}>
              <Ionicons name="finger-print-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.rowText}>
                {profile.kycVerified
                  ? `Verified${profile.kycVerifiedAt ? ` · ${new Date(profile.kycVerifiedAt).toLocaleDateString('en-NG')}` : ''}`
                  : profile.kycStatus === 'pending'
                    ? 'Verification in progress'
                    : 'Not yet verified on HomeBase'}
              </Text>
            </View>
          </View>

          <Text style={styles.hint}>
            Always inspect properties in person and verify documents before making payments.
          </Text>
        </ScrollView>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(21, 32, 29, 0.45)' },
  sheet: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(1),
    maxHeight: '78%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.line,
    marginBottom: theme.spacing(2),
  },
  header: { alignItems: 'center', paddingBottom: theme.spacing(2) },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing(1.5),
  },
  avatarText: { fontSize: 28, fontWeight: theme.font.weightBold, color: theme.colors.primary },
  name: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, color: theme.colors.ink },
  role: { fontSize: theme.font.sizeSm, color: theme.colors.muted, marginTop: 4, marginBottom: theme.spacing(1.5) },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(1.5),
  },
  sectionTitle: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing(1),
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1, fontSize: theme.font.sizeMd, color: theme.colors.ink },
  hint: {
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    lineHeight: 20,
    marginBottom: theme.spacing(2),
  },
  closeBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.pill,
    paddingVertical: theme.spacing(1.5),
    alignItems: 'center',
    marginTop: theme.spacing(1),
  },
  closeText: { color: theme.colors.white, fontWeight: theme.font.weightSemibold, fontSize: theme.font.sizeMd },
});
