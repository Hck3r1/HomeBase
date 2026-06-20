import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { onboardingColors } from '../lib/onboardingColors';

export function OnboardingVignette() {
  const { width, height } = useWindowDimensions();

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="onboardingVignette" cx="50%" cy="38%" rx="55%" ry="55%">
          <Stop offset="0%" stopColor={onboardingColors.bg} stopOpacity={0} />
          <Stop offset="62%" stopColor={onboardingColors.bg} stopOpacity={0.55} />
          <Stop offset="100%" stopColor={onboardingColors.bg} stopOpacity={0.96} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill="url(#onboardingVignette)" />
    </Svg>
  );
}
