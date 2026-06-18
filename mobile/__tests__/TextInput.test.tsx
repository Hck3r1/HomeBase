import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppTextInput } from '../src/components/TextInput';

describe('AppTextInput', () => {
  it('shows placeholder and emits text changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <AppTextInput placeholder="Email" value="" onChangeText={onChangeText} />,
    );
    const field = getByPlaceholderText('Email');
    fireEvent.changeText(field, 'a@b.com');
    expect(onChangeText).toHaveBeenCalledWith('a@b.com');
  });
});
