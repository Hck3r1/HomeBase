import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export function FieldLabel({ children, style }: { children: string; style?: object }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.muted,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
});
