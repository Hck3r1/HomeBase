import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Line, Polyline } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingParticleField } from '../../components/OnboardingParticleField';
import { OnboardingVignette } from '../../components/OnboardingVignette';
import { OnboardingPagerDots } from '../../components/OnboardingPagerDots';
import { onboardingStorage } from '../../lib/onboardingStorage';
import { onboardingColors } from '../../lib/onboardingColors';
import type { ParticleShapeType } from '../../lib/onboardingParticleShapes';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Walkthrough'>;

interface Slide {
  key: string;
  stage: string;
  shape: ParticleShapeType;
  eyebrow: string;
  titleLines: [string, string];
  titleAccent: string;
  body: string;
  cta: string;
}

const SLIDES: Slide[] = [
  {
    key: 'discover',
    stage: 'Discover',
    shape: 'house',
    eyebrow: 'Browse listings',
    titleLines: ['Every home,', 'mapped from'],
    titleAccent: 'real signals.',
    body: 'Thousands of verified rentals, sales, and new builds; filtered to what actually fits your life.',
    cta: 'Continue',
  },
  {
    key: 'trust',
    stage: 'Trust',
    shape: 'shield',
    eyebrow: 'Verified agents',
    titleLines: ['People you', 'can actually'],
    titleAccent: 'vouch for.',
    body: 'Every agent is licensed, reviewed, and ID-checked before they ever message you.',
    cta: 'Continue',
  },
  {
    key: 'settle',
    stage: 'Settle',
    shape: 'lock',
    eyebrow: 'Secure payments',
    titleLines: ['Funds held safe', 'until both sides'],
    titleAccent: 'say go.',
    body: 'Escrow-backed transfers mean nothing moves until you\'ve confirmed the deal in full.',
    cta: 'Get started',
  },
];

const LAST_INDEX = SLIDES.length - 1;

export function WalkthroughScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === LAST_INDEX;

  const finishOnboarding = (route: 'SignUp' | 'LogIn') => {
    void onboardingStorage.markOnboardingSeen();
    navigation.replace(route);
  };

  const advance = () => {
    if (isLast) {
      finishOnboarding('SignUp');
      return;
    }
    setIndex((i) => i + 1);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <OnboardingParticleField shapeType={slide.shape} />
      <OnboardingVignette />

      <View style={[styles.topbar, { paddingTop: insets.top + 12 }]}>
        <View />
        <Pressable onPress={() => finishOnboarding('LogIn')} hitSlop={12} accessibilityRole="button">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <Text style={[styles.stageLabel, { top: insets.top + 52 }]}>{slide.stage}</Text>

      <View style={[styles.dotsWrap, { bottom: 128 + insets.bottom * 0.2 }]}>
        <OnboardingPagerDots count={SLIDES.length} activeIndex={index} />
      </View>

      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 36 }]}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLine} />
          <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
        </View>

        <Text style={styles.title} accessibilityRole="header">
          {slide.titleLines[0]}
          {'\n'}
          {slide.titleLines[1]}
          {'\n'}
          <Text style={styles.titleAccent}>{slide.titleAccent}</Text>
        </Text>

        <Text style={styles.sub}>{slide.body}</Text>

        <View style={styles.cta}>
          <Pressable
            style={styles.btnNext}
            onPress={advance}
            accessibilityRole="button"
            accessibilityLabel={slide.cta}
          >
            <Text style={styles.btnNextLabel}>{slide.cta}</Text>
          </Pressable>

          <Pressable
            style={styles.btnCircle}
            onPress={advance}
            accessibilityRole="button"
            accessibilityLabel="Next slide"
          >
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Line x1={5} y1={12} x2={19} y2={12} stroke={onboardingColors.sage} strokeWidth={2} strokeLinecap="round" />
              <Polyline
                points="12 5 19 12 12 19"
                fill="none"
                stroke={onboardingColors.sage}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: onboardingColors.bg,
  },
  topbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 5,
  },
  skip: {
    fontSize: 13,
    color: onboardingColors.dim,
    letterSpacing: 0.3,
    fontWeight: '500',
  },
  stageLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 3.3,
    textTransform: 'uppercase',
    color: onboardingColors.dim,
    zIndex: 5,
  },
  dotsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    zIndex: 5,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  eyebrowLine: {
    width: 14,
    height: 1,
    backgroundColor: onboardingColors.sage,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: onboardingColors.sage,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    lineHeight: 36,
    letterSpacing: -0.3,
    color: onboardingColors.text,
    marginBottom: 14,
  },
  titleAccent: {
    color: onboardingColors.sage,
    fontWeight: '600',
  },
  sub: {
    fontSize: 15,
    lineHeight: 23,
    color: onboardingColors.dim,
    maxWidth: 300,
    marginBottom: 36,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  btnNext: {
    flex: 1,
    backgroundColor: onboardingColors.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  btnNextLabel: {
    color: onboardingColors.ctaText,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  btnCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: onboardingColors.tealMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
