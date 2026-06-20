import React from 'react';
import { render } from '@testing-library/react-native';
import { InputGroup } from '../src/components/InputGroup';
import { AppTextInput } from '../src/components/TextInput';

describe('InputGroup', () => {
  it('renders its children', () => {
    const { getByPlaceholderText } = render(
      <InputGroup>
        <AppTextInput placeholder="Email Address" />
      </InputGroup>,
    );
    expect(getByPlaceholderText('Email Address')).toBeTruthy();
  });
});
