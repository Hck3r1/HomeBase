import React from 'react';
import { View, StyleSheet } from 'react-native';
import { onboardingColors } from '../lib/onboardingColors';

interface Props {
  count: number;
  activeIndex: number;
}

export function OnboardingPagerDots({ count, activeIndex }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: onboardingColors.tealMid,
  },
  dotActive: {
    width: 20,
    borderRadius: 3,
    backgroundColor: onboardingColors.accent,
  },
});
