import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { WalkthroughScreen } from '../src/screens/auth/WalkthroughScreen';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  default: () => ({ width: 390, height: 844 }),
}));

jest.mock('../src/components/OnboardingParticleField', () => ({
  OnboardingParticleField: () => null,
}));

jest.mock('../src/components/OnboardingVignette', () => ({
  OnboardingVignette: () => null,
}));

jest.mock('../src/lib/onboardingStorage', () => ({
  onboardingStorage: {
    markOnboardingSeen: jest.fn(),
  },
}));

import { onboardingStorage } from '../src/lib/onboardingStorage';

const navigation = { replace: jest.fn(), navigate: jest.fn() };
const PAGE_WIDTH = 390;

function scrollToSlide(screen: ReturnType<typeof render>, slideIndex: number) {
  const list = screen.UNSAFE_getByType(FlatList);
  const offset = { x: PAGE_WIDTH * slideIndex, y: 0 };
  fireEvent.scroll(list, { nativeEvent: { contentOffset: offset } });
  fireEvent(list, 'onMomentumScrollEnd', { nativeEvent: { contentOffset: offset } });
}

describe('WalkthroughScreen', () => {
  beforeEach(() => {
    navigation.replace.mockClear();
    jest.mocked(onboardingStorage.markOnboardingSeen).mockClear();
  });

  it('renders the first slide with continue action', () => {
    const { getByText, getByTestId } = render(
      <WalkthroughScreen navigation={navigation as any} route={{ key: 'Walkthrough', name: 'Walkthrough' }} />,
    );
    expect(getByText('Browse listings')).toBeTruthy();
    expect(getByTestId('walkthrough-continue-0')).toBeTruthy();
    expect(getByText('Discover')).toBeTruthy();
  });

  it('advances to the next slide when continue is pressed', () => {
    const screen = render(
      <WalkthroughScreen navigation={navigation as any} route={{ key: 'Walkthrough', name: 'Walkthrough' }} />,
    );
    fireEvent.press(screen.getByTestId('walkthrough-continue-0'));
    scrollToSlide(screen, 1);
    expect(screen.getByText('Verified agents')).toBeTruthy();
  });

  it('skips to login and marks onboarding seen', () => {
    const { getByText } = render(
      <WalkthroughScreen navigation={navigation as any} route={{ key: 'Walkthrough', name: 'Walkthrough' }} />,
    );
    fireEvent.press(getByText('Skip'));
    expect(onboardingStorage.markOnboardingSeen).toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith('LogIn');
  });

  it('finishes onboarding from the last slide', () => {
    const screen = render(
      <WalkthroughScreen navigation={navigation as any} route={{ key: 'Walkthrough', name: 'Walkthrough' }} />,
    );
    fireEvent.press(screen.getByTestId('walkthrough-continue-0'));
    scrollToSlide(screen, 1);
    fireEvent.press(screen.getByTestId('walkthrough-continue-1'));
    scrollToSlide(screen, 2);
    fireEvent.press(screen.getByTestId('walkthrough-continue-2'));
    expect(onboardingStorage.markOnboardingSeen).toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith('SignUp');
  });
});
