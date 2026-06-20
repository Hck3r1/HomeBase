import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTextInput } from './TextInput';
import { theme } from '../theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  onFilterPress?: () => void;
  placeholder?: string;
  style?: ViewStyle;
}

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onFilterPress,
  placeholder = 'Search city, area, or title',
  style,
}: SearchBarProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name="search" size={20} color={theme.colors.muted} style={styles.searchIcon} />
      <AppTextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        style={styles.input}
      />
      {onFilterPress ? (
        <Pressable onPress={onFilterPress} hitSlop={8} style={styles.filterBtn} accessibilityRole="button">
          <Ionicons name="options-outline" size={20} color={theme.colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingHorizontal: theme.spacing(1.5),
    minHeight: 52,
    ...theme.shadow.sm,
  },
  searchIcon: { marginRight: 4 },
  input: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
