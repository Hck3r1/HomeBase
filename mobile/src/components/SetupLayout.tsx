import React from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthBackButton } from './AuthBackButton';
import { SetupProgressBar } from './SetupProgressBar';
import { Button } from './Button';
import { theme } from '../theme';

interface Props {
  title: string;
  step: number;
  totalSteps?: number;
  hint?: string;
  nextLabel?: string;
  onBack?: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export function SetupLayout({
  title,
  step,
  totalSteps = 3,
  hint,
  nextLabel = 'Next',
  onBack,
  onNext,
  nextDisabled,
  loading,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      {onBack ? (
        <View style={styles.back}>
          <AuthBackButton onPress={onBack} />
        </View>
      ) : (
        <View style={styles.backSpacer} />
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{title}</Text>
          <SetupProgressBar step={step} total={totalSteps} />
          {children}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        <Button label={nextLabel} onPress={onNext} disabled={nextDisabled} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  flex: { flex: 1 },
  back: {
    paddingHorizontal: theme.spacing(3),
    marginBottom: theme.spacing(1),
  },
  backSpacer: {
    height: 44,
    marginBottom: theme.spacing(1),
  },
  scroll: {
    paddingHorizontal: theme.spacing(3),
  },
  title: {
    fontSize: theme.font.sizeXl,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    letterSpacing: -0.3,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(1),
    backgroundColor: theme.colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.line,
  },
  hint: {
    fontSize: theme.font.sizeXs,
    color: theme.colors.muted,
    lineHeight: 18,
    marginBottom: theme.spacing(1.5),
  },
});
