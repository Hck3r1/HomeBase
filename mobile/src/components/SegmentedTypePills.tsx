import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';
import { ListingType } from '../types/listing';

const OPTIONS: { label: string; value: ListingType }[] = [
  { label: 'Rent', value: 'rent' },
  { label: 'Buy', value: 'sale' },
  { label: 'Short-stay', value: 'shortstay' },
];

interface Props {
  value: ListingType;
  onChange: (type: ListingType) => void;
  style?: object;
}

export function SegmentedTypePills({ value, onChange, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...theme.shadow.sm,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
  },
  pillActive: { backgroundColor: theme.colors.primary },
  label: {
    color: theme.colors.muted,
    fontWeight: theme.font.weightSemibold,
    fontSize: theme.font.sizeSm,
  },
  labelActive: { color: theme.colors.white },
});
