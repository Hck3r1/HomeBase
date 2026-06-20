import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Props {
  step: number;
  total?: number;
}

export function SetupProgressBar({ step, total = 3 }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, i < step && styles.segmentFilled]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 0,
    marginBottom: theme.spacing(1.5),
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.line,
  },
  segmentFilled: {
    backgroundColor: theme.colors.primary,
  },
});
