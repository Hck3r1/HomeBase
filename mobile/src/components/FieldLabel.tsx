import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { theme } from '../theme';

interface Props {
  children: string;
  required?: boolean;
  style?: TextStyle;
}

export function FieldLabel({ children, required, style }: Props) {
  return (
    <Text style={[styles.label, style]}>
      {children}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.muted,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  required: {
    color: theme.colors.danger,
    fontWeight: theme.font.weightBold,
  },
});
