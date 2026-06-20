import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { Button } from './Button';

interface AuthMessageModalProps {
  visible: boolean;
  title: string;
  message: string;
  actionLabel?: string;
  onClose: () => void;
}

export function AuthMessageModal({
  visible,
  title,
  message,
  actionLabel = 'Continue',
  onClose,
}: AuthMessageModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Button label={actionLabel} onPress={onClose} style={styles.button} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(21, 32, 29, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: 24,
  },
  title: {
    fontSize: theme.font.sizeLg,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    textAlign: 'center',
  },
  message: {
    marginTop: theme.spacing(1.5),
    color: theme.colors.muted,
    fontSize: theme.font.sizeSm,
    lineHeight: 20,
    textAlign: 'center',
  },
  button: { marginTop: theme.spacing(3) },
});
