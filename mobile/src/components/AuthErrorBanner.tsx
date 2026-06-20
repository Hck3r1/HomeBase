import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export function AuthErrorBanner({ message }: { message: string }) {
  return <Text style={styles.banner}>{message}</Text>;
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FDEDEC',
    color: theme.colors.danger,
    fontSize: theme.font.sizeSm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radii.sm,
    marginBottom: theme.spacing(1.5),
    overflow: 'hidden',
  },
});
