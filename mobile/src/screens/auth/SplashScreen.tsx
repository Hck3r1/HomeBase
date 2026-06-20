import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeBaseMark } from '../../components/HomeBaseMark';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import type { AuthStackParamList } from '../../navigation/AuthStack';

const SPLASH_MS = 3000;

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  const showOnboarding = useAuthStore((s) => s.showOnboarding);
  const finishSplash = useAuthStore((s) => s.finishSplash);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => {
      finishSplash();
      if (!isAuthed) navigation.replace(showOnboarding ? 'Walkthrough' : 'LogIn');
    }, SPLASH_MS);
    return () => clearTimeout(t);
  }, [hydrated, isAuthed, showOnboarding, navigation, finishSplash]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <HomeBaseMark />
      <Text style={styles.name}>HomeBase</Text>
      <Text style={styles.tag}>Rent · Buy · Stay</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: theme.font.weightBold,
    letterSpacing: 0.5,
    marginTop: 16,
  },
  tag: {
    color: theme.colors.white,
    fontSize: theme.font.sizeXs,
    opacity: 0.8,
    marginTop: 4,
  },
});
