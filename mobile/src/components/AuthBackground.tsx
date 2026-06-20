import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

export function AuthBackground() {
  return (
    <View style={styles.root} pointerEvents="none">
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.white,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTop: {
    width: 280,
    height: 280,
    top: -80,
    right: -60,
    backgroundColor: theme.colors.chip,
    opacity: 0.85,
  },
  blobBottom: {
    width: 220,
    height: 220,
    bottom: 120,
    left: -70,
    backgroundColor: `${theme.colors.primary}18`,
  },
});
