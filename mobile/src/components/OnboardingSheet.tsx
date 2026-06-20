import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { theme } from '../theme';

interface Props {
  children: React.ReactNode;
  paddingBottom?: number;
  minHeight?: number;
}

export function OnboardingSheet({ children, paddingBottom = 0, minHeight }: Props) {
  const { width } = useWindowDimensions();
  const topRadius = Math.min(width * 0.48, 200);

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom,
          minHeight,
          borderTopLeftRadius: topRadius,
          borderTopRightRadius: topRadius,
          marginTop: -topRadius * 0.14,
        },
      ]}
    >
      <View style={[styles.body, { paddingTop: topRadius * 0.22 }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.white,
    zIndex: 1,
    overflow: 'hidden',
  },
  body: {
    width: '100%',
    paddingHorizontal: 32,
  },
});
