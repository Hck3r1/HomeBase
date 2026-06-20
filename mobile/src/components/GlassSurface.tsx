import React from 'react';
import { View, Platform, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { theme } from '../theme';

type GlassEffectStyle = 'regular' | 'clear';

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  effect?: GlassEffectStyle;
}

export function GlassSurface({ children, style, interactive, effect = 'regular' }: Props) {
  const flat = StyleSheet.flatten(style) ?? {};

  if (isGlassEffectAPIAvailable()) {
    return (
      <GlassView
        style={[styles.base, flat]}
        glassEffectStyle={effect}
        isInteractive={interactive}
        tintColor={`${theme.colors.primary}20`}
      >
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={55} tint="systemChromeMaterialLight" style={[styles.base, styles.fallback, flat]}>
        {children}
      </BlurView>
    );
  }

  return <View style={[styles.base, styles.fallback, flat]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  fallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
});
