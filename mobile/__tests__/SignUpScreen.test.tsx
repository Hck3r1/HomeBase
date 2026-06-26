import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SignUpScreen } from '../src/screens/auth/SignUpScreen';

jest.mock('../src/store/authStore', () => ({
  useAuthStore: (selector: (s: { signIn: jest.Mock }) => unknown) =>
    selector({ signIn: jest.fn() }),
}));

const navigation = { replace: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn(() => false) };

describe('SignUpScreen', () => {
  it('shows validation error for short password', () => {
    const { getByPlaceholderText, getByText } = render(
      <SignUpScreen navigation={navigation as any} route={{ key: 'SignUp', name: 'SignUp' }} />,
    );
    fireEvent.changeText(getByPlaceholderText('First name'), 'Moyo');
    fireEvent.changeText(getByPlaceholderText('Last name'), 'Ade');
    fireEvent.changeText(getByPlaceholderText('you@example.com'), 'a@x.com');
    fireEvent.changeText(getByPlaceholderText('At least 8 characters'), '123');
    fireEvent.press(getByText('Sign up'));
    expect(getByText('Password must be at least 8 characters')).toBeTruthy();
  });
});
