import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Props {
  checked: boolean;
  onToggle: () => void;
}

export function TermsCheckbox({ checked, onToggle }: Props) {
  return (
    <Pressable onPress={onToggle} style={styles.row}>
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked && <Text style={styles.tick}>✓</Text>}
      </View>
      <Text style={styles.text}>
        I agree to HomeBase&apos;s <Text style={styles.em}>Terms</Text> and <Text style={styles.em}>Privacy Notice</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginBottom: theme.spacing(2) },
  box: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  boxChecked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  tick: { color: theme.colors.white, fontSize: 11, fontWeight: theme.font.weightBold },
  text: { flex: 1, fontSize: theme.font.sizeXs, color: theme.colors.muted, lineHeight: 17 },
  em: { color: '#5c6562', fontWeight: theme.font.weightSemibold },
});
