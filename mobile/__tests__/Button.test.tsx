import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../src/components/Button';

describe('Button', () => {
  it('renders its label', () => {
    const { getByText } = render(<Button label="Sign up" onPress={() => {}} />);
    expect(getByText('Sign up')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Tap" onPress={onPress} />);
    fireEvent.press(getByText('Tap'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Off" onPress={onPress} disabled />);
    fireEvent.press(getByText('Off'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
