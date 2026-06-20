import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useSavedStore } from '../store/savedStore';

interface Props {
  listingId: string;
  size?: number;
  style?: object;
}

export function SaveHeartButton({ listingId, size = 24, style }: Props) {
  const saved = useSavedStore((s) => s.ids.includes(listingId));
  const toggle = useSavedStore((s) => s.toggle);

  return (
    <Pressable
      onPress={() => void toggle(listingId)}
      hitSlop={10}
      style={[styles.btn, style]}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Remove from saved' : 'Save listing'}
    >
      <Ionicons
        name={saved ? 'heart' : 'heart-outline'}
        size={size}
        color={saved ? theme.colors.danger : theme.colors.ink}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
});
