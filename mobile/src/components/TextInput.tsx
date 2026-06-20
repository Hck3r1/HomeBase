import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { theme } from '../theme';

export function AppTextInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={theme.colors.muted}
      style={styles.input}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: theme.font.sizeSm,
    color: theme.colors.ink,
    backgroundColor: 'transparent',
  },
});
