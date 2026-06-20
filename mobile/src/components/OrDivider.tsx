import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export function OrDivider() {
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>Or</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: theme.spacing(2) },
  line: { flex: 1, height: 1, backgroundColor: theme.colors.line },
  label: { color: theme.colors.muted, fontSize: theme.font.sizeXs },
});
