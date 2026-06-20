import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}

export function SelectableChip({ label, selected, onPress, compact }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, compact && styles.chipCompact, selected && styles.chipSelected]}
    >
      {selected && <Ionicons name="checkmark" size={14} color={theme.colors.primary} style={styles.icon} />}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    minHeight: 44,
  },
  chipCompact: {
    flex: 0,
    paddingHorizontal: 14,
  },
  chipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.chip,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.ink,
    textAlign: 'center',
  },
  labelSelected: {
    color: theme.colors.primary,
  },
});
