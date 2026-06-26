import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTextInput } from './TextInput';
import { theme } from '../theme';
import { AddressSuggestion, searchAddresses } from '../lib/addressSearch';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (place: AddressSuggestion) => void;
  placeholder?: string;
  city?: string;
  state?: string;
  style?: ViewStyle;
}

export function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder = 'Full street address',
  city,
  state,
  style,
}: Props) {
  const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const skipSearch = React.useRef(false);

  React.useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAddresses(trimmed, { city, state });
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [value, city, state]);

  const pick = (place: AddressSuggestion) => {
    skipSearch.current = true;
    onSelect(place);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.inputBox}>
        <AppTextInput
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
        />
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : null}
      </View>

      {open && suggestions.length > 0 ? (
        <View style={styles.dropdown}>
          {suggestions.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => pick(item)}
              style={[styles.row, index < suggestions.length - 1 && styles.rowBorder]}
            >
              <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.rowText} numberOfLines={2}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 20 },
  inputBox: {
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.input,
    overflow: 'hidden',
    position: 'relative',
  },
  loader: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  dropdown: {
    marginTop: theme.spacing(0.5),
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing(1),
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(1.25),
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  rowText: {
    flex: 1,
    color: theme.colors.ink,
    fontSize: theme.font.sizeSm,
    lineHeight: 18,
  },
});
