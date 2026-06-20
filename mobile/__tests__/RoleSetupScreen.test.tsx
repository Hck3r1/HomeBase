import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { RoleSetupScreen } from '../src/screens/setup/RoleSetupScreen';
import { api } from '../src/lib/api';
import { useAuthStore } from '../src/store/authStore';

jest.spyOn(api, 'patch').mockResolvedValue({
  data: {
    id: '1',
    name: 'Maya',
    email: 'maya@x.com',
    role: 'lister',
    listerType: 'agent',
    setupCompletedAt: null,
    preferences: null,
  },
} as any);

const navigation = { navigate: jest.fn(), goBack: jest.fn() };

describe('RoleSetupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: {
        id: '1',
        name: 'Maya',
        email: 'maya@x.com',
        role: 'seeker',
        listerType: null,
      },
    });
  });

  it('upgrades to agent lister and continues to preferences', async () => {
    const { getByText } = render(<RoleSetupScreen navigation={navigation as any} route={{} as any} />);
    fireEvent.press(getByText('List properties'));
    fireEvent.press(getByText('Agent'));
    fireEvent.press(getByText('Next'));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith('/me/role', { role: 'lister', listerType: 'agent' }),
    );
    expect(navigation.navigate).toHaveBeenCalledWith('PreferencesSetup');
  });
});
