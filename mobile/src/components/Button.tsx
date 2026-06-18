import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

type Variant = 'primary' | 'secondary';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, !isPrimary && styles.labelSecondary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 15, borderRadius: theme.radii.pill, alignItems: 'center' },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.line },
  disabled: { opacity: 0.5 },
  label: { color: theme.colors.white, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold },
  labelSecondary: { color: theme.colors.ink },
});
