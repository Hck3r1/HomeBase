import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../theme';

const LENGTH = 6;
const CELL_WIDTH = 48;
const CELL_HEIGHT = 56;
const CELL_GAP = 8;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function OtpInput({ value, onChange, disabled }: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const digits = Array.from({ length: LENGTH }, (_, index) => value[index] ?? '');

  function handleChange(text: string) {
    onChange(text.replace(/\D/g, '').slice(0, LENGTH));
  }

  function focusInput() {
    if (!disabled) inputRef.current?.focus();
  }

  return (
    <Pressable style={styles.wrap} onPress={focusInput} disabled={disabled}>
      <View style={styles.row} pointerEvents="none">
        {digits.map((digit, index) => (
          <View
            key={index}
            style={[
              styles.cell,
              digit !== '' && styles.cellFilled,
              index === value.length && value.length < LENGTH && styles.cellActive,
            ]}
          >
            <Text style={styles.digit}>{digit}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={LENGTH}
        editable={!disabled}
        autoFocus
        caretHidden
        selectionColor="transparent"
        style={styles.overlayInput}
        accessibilityLabel="One-time code"
      />
    </Pressable>
  );
}

const rowWidth = LENGTH * CELL_WIDTH + (LENGTH - 1) * CELL_GAP;

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    width: rowWidth,
    height: CELL_HEIGHT,
    marginVertical: theme.spacing(1),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: rowWidth,
    height: CELL_HEIGHT,
  },
  cell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.chip,
  },
  cellActive: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  digit: {
    fontSize: 22,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    lineHeight: 26,
  },
  overlayInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
    fontSize: 1,
    color: 'transparent',
  },
});
