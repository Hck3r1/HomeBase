import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { theme } from '../theme';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  children: React.ReactNode;
}

export function SetupSheet({
  visible,
  title,
  subtitle,
  confirmLabel = 'Confirm',
  onClose,
  onConfirm,
  loading,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.ink} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          <Button label={confirmLabel} onPress={onConfirm} loading={loading} style={styles.confirm} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(21, 32, 29, 0.35)',
  },
  wrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(2.5),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
    gap: 12,
  },
  headerText: { flex: 1 },
  title: {
    fontSize: theme.font.sizeLg,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
  },
  subtitle: {
    marginTop: 4,
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  confirm: {
    marginTop: theme.spacing(2),
  },
});
