import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthBackButton } from './AuthBackButton';
import { theme } from '../theme';

interface Props {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
  transparent?: boolean;
}

export function ScreenHeader({ title, subtitle, onBack, right, style, transparent }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + theme.spacing(1) },
        transparent && styles.transparent,
        style,
      ]}
    >
      <View style={styles.row}>
        {onBack ? <AuthBackButton onPress={onBack} /> : <View style={styles.spacer} />}
        <View style={styles.center}>
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>{right ?? <View style={styles.spacer} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing(2),
    paddingBottom: theme.spacing(1),
    backgroundColor: theme.colors.surface,
  },
  transparent: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  spacer: { width: 44 },
  center: { flex: 1, alignItems: 'center' },
  right: { minWidth: 44, alignItems: 'flex-end' },
  title: {
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
  },
  subtitle: {
    fontSize: theme.font.sizeXs,
    color: theme.colors.muted,
    marginTop: 2,
  },
});
