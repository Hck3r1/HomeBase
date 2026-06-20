import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SetupProgressBar } from '../SetupProgressBar';
import { theme } from '../../theme';

interface Props {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
}

export function WizardStepHeader({ step, total, title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <SetupProgressBar step={step} total={total} />
      <Text style={styles.stepLabel}>
        Step {step} of {total}
      </Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing(3),
    marginBottom: theme.spacing(1),
  },
  stepLabel: {
    marginTop: theme.spacing(1.5),
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    marginTop: theme.spacing(0.5),
    fontSize: theme.font.sizeXl,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: theme.spacing(0.5),
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    lineHeight: 20,
  },
});
