import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SocialProviderIcon } from './SocialProviderIcon';
import { theme } from '../theme';

interface Props {
  onProvider: (p: 'google' | 'facebook' | 'x') => void;
}

const PROVIDERS: { id: 'google' | 'facebook' | 'x'; label: string }[] = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'facebook', label: 'Continue with Facebook' },
  { id: 'x', label: 'Continue with X' },
];

export function SocialButtons({ onProvider }: Props) {
  return (
    <View>
      {PROVIDERS.map((p) => (
        <Pressable key={p.id} style={styles.btn} onPress={() => onProvider(p.id)}>
          <View style={styles.iconSlot}>
            <SocialProviderIcon provider={p.id} />
          </View>
          <Text style={styles.label}>{p.label}</Text>
          <View style={styles.iconSlot} />
        </Pressable>
      ))}
    </View>
  );
}

const ICON_SLOT = 20;

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.pill,
    paddingVertical: 13,
    paddingHorizontal: 20,
    marginBottom: 11,
    backgroundColor: theme.colors.white,
  },
  iconSlot: {
    width: ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    color: theme.colors.ink,
    fontWeight: theme.font.weightSemibold,
    fontSize: theme.font.sizeSm,
    textAlign: 'center',
  },
});
