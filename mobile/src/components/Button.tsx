import React from 'react';
import { ActivityIndicator, Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

type Variant = 'primary' | 'secondary' | 'soft';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading, style }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSoft = variant === 'soft';
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.base,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        isSoft && styles.soft,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.colors.white : theme.colors.primary} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'secondary' && styles.labelSecondary,
            isSoft && styles.labelSoft,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 15, borderRadius: theme.radii.pill, alignItems: 'center' },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.line },
  soft: { backgroundColor: theme.colors.card },
  disabled: { opacity: 0.5 },
  label: { color: theme.colors.white, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold },
  labelSecondary: { color: theme.colors.ink },
  labelSoft: { color: theme.colors.ink, fontWeight: theme.font.weightSemibold },
});
