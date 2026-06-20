import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme';

interface Props {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function SelectChip({ label, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  chipActive: {
    backgroundColor: theme.colors.chip,
    borderColor: theme.colors.primary,
  },
  text: {
    color: theme.colors.muted,
    fontSize: theme.font.sizeSm,
    textTransform: 'capitalize',
  },
  textActive: {
    color: theme.colors.primary,
    fontWeight: theme.font.weightSemibold,
  },
});
