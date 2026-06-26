import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HomeBaseMark } from './HomeBaseMark';
import { theme } from '../theme';

interface Props {
  subtitle?: string;
}

export function AppBrandRow({ subtitle }: Props) {
  return (
    <View style={styles.row}>
      <HomeBaseMark size={30} color={theme.colors.primary} />
      <View style={styles.copy}>
        <Text style={styles.name}>HomeBase</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.25),
  },
  copy: { justifyContent: 'center' },
  name: {
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: theme.font.sizeXs,
    color: theme.colors.muted,
    marginTop: 1,
  },
});
