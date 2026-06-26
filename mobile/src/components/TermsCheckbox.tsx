import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassSurface } from './GlassSurface';
import { theme } from '../theme';

interface Props {
  checked: boolean;
  onToggle: () => void;
}

export function TermsCheckbox({ checked, onToggle }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={styles.pressable}
    >
      <GlassSurface style={styles.card} effect="regular">
        <View style={styles.row}>
          <View style={[styles.box, checked && styles.boxChecked]}>
            {checked ? <Ionicons name="checkmark" size={18} color={theme.colors.white} /> : null}
          </View>
          <Text style={styles.text}>
            I agree to HomeBase&apos;s{' '}
            <Text style={styles.link}>Terms of Service</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { marginBottom: theme.spacing(2) },
  card: {
    borderRadius: theme.radii.md,
    padding: theme.spacing(1.75),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  text: {
    flex: 1,
    fontSize: theme.font.sizeSm,
    color: theme.colors.ink,
    lineHeight: 21,
  },
  link: {
    color: theme.colors.primary,
    fontWeight: theme.font.weightSemibold,
  },
});
