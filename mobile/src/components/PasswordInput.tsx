import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { theme } from '../theme';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}

const FIELD_HEIGHT = 48;

export function PasswordInput({ value, onChangeText, placeholder = 'Password' }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.row}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
        textContentType="password"
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        onPress={() => setVisible((v) => !v)}
        style={styles.toggle}
        hitSlop={4}
      >
        <Text style={styles.toggleLabel}>{visible ? 'Hide' : 'Show'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: FIELD_HEIGHT,
  },
  input: {
    flex: 1,
    minHeight: FIELD_HEIGHT,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 14,
    fontSize: theme.font.sizeSm,
    color: theme.colors.ink,
    backgroundColor: 'transparent',
  },
  toggle: {
    minHeight: FIELD_HEIGHT,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleLabel: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
  },
});
