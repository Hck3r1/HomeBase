import React from 'react';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export function WelcomeScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(6) }}>
        HomeBase
      </Text>
      <Text style={{ color: theme.colors.muted, marginBottom: theme.spacing(3) }}>Rent · Buy · Stay</Text>
      <Button label="Continue (dev)" onPress={() => signIn({ accessToken: 'dev', refreshToken: 'dev' })} />
    </Screen>
  );
}
