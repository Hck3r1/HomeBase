import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme';

interface Props {
  count: number;
  activeIndex: number;
  scrollX?: Animated.Value;
  slideWidth?: number;
}

export function PaginationDots({ count, activeIndex, scrollX, slideWidth }: Props) {
  if (scrollX && slideWidth) {
    return (
      <View style={styles.row}>
        {Array.from({ length: count }, (_, i) => {
          const inputRange = [(i - 1) * slideWidth, i * slideWidth, (i + 1) * slideWidth];
          const scaleX = scrollX.interpolate({
            inputRange,
            outputRange: [1, 2.75, 1],
            extrapolate: 'clamp',
          });
          const tint = scrollX.interpolate({
            inputRange,
            outputRange: [0, 1, 0],
            extrapolate: 'clamp',
          });
          return (
            <View key={i} style={styles.slot}>
              <View style={styles.dot} />
              <Animated.View
                style={[
                  styles.dot,
                  styles.dotActive,
                  { opacity: tint, transform: [{ scaleX }] },
                ]}
              />
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 28 },
  slot: { width: 10, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.line },
  dotActive: { position: 'absolute', backgroundColor: theme.colors.primary },
});
