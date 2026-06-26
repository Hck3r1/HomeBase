import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

const VIEW_W = 80;
const VIEW_H = 92;

interface Props {
  /** Width in points; height scales to preserve the icon aspect ratio. */
  size?: number;
  color?: string;
}

export function HomeBaseMark({ size = 40, color = '#3B7A6F' }: Props) {
  const height = (size * VIEW_H) / VIEW_W;

  return (
    <Svg width={size} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} accessibilityRole="image">
      <Path d="M 40 6 L 70 34 L 10 34 Z" fill={color} />
      <Rect x="2" y="44" width="76" height="9" rx="4.5" fill={color} />
      <Rect x="12" y="60" width="56" height="9" rx="4.5" fill={color} opacity={0.7} />
      <Rect x="22" y="76" width="36" height="9" rx="4.5" fill={color} opacity={0.42} />
    </Svg>
  );
}

export function markHeight(size: number) {
  return (size * VIEW_H) / VIEW_W;
}
