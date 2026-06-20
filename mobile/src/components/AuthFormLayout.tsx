import React from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthBackButton } from './AuthBackButton';
import { AuthBackground } from './AuthBackground';
import { GlassSurface } from './GlassSurface';
import { HomeBaseMark } from './HomeBaseMark';
import { theme } from '../theme';

const BACK_SIZE = 44;

interface Props {
  title: string;
  subtitle: React.ReactNode;
  onBack?: () => void;
  children: React.ReactNode;
}

export function AuthFormLayout({ title, subtitle, onBack, children }: Props) {
  const insets = useSafeAreaInsets();
  const headerTop = insets.top + 8;
  const scrollTopPadding = onBack
    ? headerTop + BACK_SIZE + theme.spacing(2)
    : headerTop + theme.spacing(2);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar style="dark" />
      <AuthBackground />

      {onBack ? (
        <View style={[styles.fixedBack, { top: headerTop }]}>
          <GlassSurface style={styles.backGlass} interactive effect="clear">
            <AuthBackButton onPress={onBack} />
          </GlassSurface>
        </View>
      ) : null}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: scrollTopPadding }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <HomeBaseMark size={44} color={theme.colors.primary} />
            <Text style={styles.title}>{title}</Text>
            <View style={styles.subtitleWrap}>{subtitle}</View>
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  fixedBack: {
    position: 'absolute',
    left: theme.spacing(3),
    zIndex: 10,
  },
  backGlass: {
    width: BACK_SIZE,
    height: BACK_SIZE,
    borderRadius: BACK_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: theme.spacing(3),
    paddingBottom: theme.spacing(4),
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing(3),
    paddingHorizontal: theme.spacing(1),
  },
  title: {
    fontSize: theme.font.sizeXl,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    letterSpacing: -0.3,
    marginTop: theme.spacing(1.5),
    textAlign: 'center',
  },
  subtitleWrap: {
    marginTop: 8,
    alignItems: 'center',
  },
});
