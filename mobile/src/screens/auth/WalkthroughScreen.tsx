import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Line, Polyline } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingParticleField } from '../../components/OnboardingParticleField';
import { OnboardingVignette } from '../../components/OnboardingVignette';
import { OnboardingPagerDots } from '../../components/OnboardingPagerDots';
import { onboardingStorage } from '../../lib/onboardingStorage';
import { onboardingColors } from '../../lib/onboardingColors';
import { HomeBaseMark } from '../../components/HomeBaseMark';
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
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  const finishOnboarding = (route: 'SignUp' | 'LogIn') => {
    void onboardingStorage.markOnboardingSeen();
    navigation.replace(route);
  };

  const goToSlide = (nextIndex: number) => {
    listRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
  };

  const advance = () => {
    if (index === LAST_INDEX) {
      finishOnboarding('SignUp');
      return;
    }
    goToSlide(index + 1);
  };

  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
      if (nextIndex >= 0 && nextIndex < SLIDES.length) {
        setIndex(nextIndex);
      }
    },
    [width],
  );

  const renderSlide: ListRenderItem<Slide> = useCallback(
    ({ item, index: slideIndex }) => (
      <View style={[styles.page, { width }]}>
        <Text style={[styles.stageLabel, { top: insets.top + 52 }]}>{item.stage}</Text>

        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 36 }]}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrow}>{item.eyebrow}</Text>
          </View>

          <Text style={styles.title} accessibilityRole="header">
            {item.titleLines[0]}
            {'\n'}
            {item.titleLines[1]}
            {'\n'}
            <Text style={styles.titleAccent}>{item.titleAccent}</Text>
          </Text>

          <Text style={styles.sub}>{item.body}</Text>

          <View style={styles.cta}>
            <Pressable
              style={styles.btnNext}
              onPress={advance}
              accessibilityRole="button"
              accessibilityLabel={item.cta}
              testID={`walkthrough-continue-${slideIndex}`}
            >
              <Text style={styles.btnNextLabel}>{item.cta}</Text>
            </Pressable>

            <Pressable
              style={styles.btnCircle}
              onPress={advance}
              accessibilityRole="button"
              accessibilityLabel="Next slide"
              testID={`walkthrough-next-${slideIndex}`}
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
    ),
    [advance, insets.bottom, insets.top, width],
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <OnboardingParticleField shapeType={slide.shape} />
      <OnboardingVignette />

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        bounces={false}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        style={styles.pager}
        contentContainerStyle={styles.pagerContent}
      />

      <View style={[styles.topbar, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <View style={styles.topBrand}>
          <HomeBaseMark size={26} color={onboardingColors.sage} />
          <Text style={styles.topBrandText}>HomeBase</Text>
        </View>
        <Pressable onPress={() => finishOnboarding('LogIn')} hitSlop={12} accessibilityRole="button">
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <View style={[styles.dotsWrap, { bottom: 128 + insets.bottom * 0.2 }]} pointerEvents="none">
        <OnboardingPagerDots count={SLIDES.length} activeIndex={index} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: onboardingColors.bg,
  },
  pager: {
    flex: 1,
    zIndex: 2,
  },
  pagerContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'flex-end',
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
  topBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBrandText: {
    fontSize: 15,
    fontWeight: '600',
    color: onboardingColors.text,
    letterSpacing: -0.2,
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
  },
  dotsWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
  },
  content: {
    paddingHorizontal: 32,
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
