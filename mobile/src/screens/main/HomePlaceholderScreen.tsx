import React from 'react';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export function HomePlaceholderScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold, marginTop: theme.spacing(6) }}>
        Home (placeholder)
      </Text>
      <Button label="Sign out" variant="secondary" onPress={signOut} style={{ marginTop: theme.spacing(2) }} />
    </Screen>
  );
}
