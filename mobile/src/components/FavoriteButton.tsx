import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFavorite, useToggleFavorite } from '../api/favorites';
import { theme } from '../theme';

interface Props {
  listingId: string;
  size?: number;
  style?: ViewStyle;
}

export function FavoriteButton({ listingId, size = 20, style }: Props) {
  const isFavorited = useIsFavorite(listingId);
  const toggle = useToggleFavorite();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isFavorited ? 'Remove from saved' : 'Save listing'}
      accessibilityState={{ selected: isFavorited }}
      onPress={() => toggle.mutate({ listingId, isFavorited })}
      style={[styles.btn, style]}
      hitSlop={8}
    >
      <Ionicons
        name={isFavorited ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavorited ? theme.colors.danger : theme.colors.ink}
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
