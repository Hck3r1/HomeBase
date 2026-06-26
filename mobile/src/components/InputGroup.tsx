import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

export function InputGroup({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <View style={styles.group}>
      {items.map((child, i) => (
        <View key={i} style={[styles.row, i < items.length - 1 && styles.divider]}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.input,
    overflow: 'hidden',
  },
  row: {},
  divider: { borderBottomWidth: 1, borderBottomColor: theme.colors.line },
});
