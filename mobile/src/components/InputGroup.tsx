import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GlassSurface } from './GlassSurface';
import { theme } from '../theme';

export function InputGroup({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <GlassSurface style={styles.group} effect="regular">
      {items.map((child, i) => (
        <View key={i} style={[styles.row, i < items.length - 1 && styles.divider]}>
          {child}
        </View>
      ))}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: theme.radii.md,
  },
  row: {},
  divider: { borderBottomWidth: 1, borderBottomColor: 'rgba(230, 234, 232, 0.8)' },
});
