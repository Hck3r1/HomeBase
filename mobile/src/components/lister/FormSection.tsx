import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';

interface Props {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function FormSection({ title, subtitle, children }: Props) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.xl,
    padding: theme.spacing(2.5),
    marginBottom: theme.spacing(2),
    ...theme.shadow.card,
  },
  title: {
    fontSize: theme.font.sizeLg,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    marginBottom: theme.spacing(0.5),
  },
  subtitle: {
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    lineHeight: 20,
    marginBottom: theme.spacing(2),
  },
});
