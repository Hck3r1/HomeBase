import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { AuthStack } from './AuthStack';
import { SetupStack } from './SetupStack';
import { MainTabs } from './MainTabs';

export function RootNavigator() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setupCompletedAt = useAuthStore((s) => s.user?.setupCompletedAt);

  const isAuthenticated = accessToken !== null;
  const needsSetup = isAuthenticated && setupCompletedAt == null;

  const showMain = hydrated && isAuthenticated && !needsSetup;
  const showSetup = hydrated && isAuthenticated && needsSetup;

  return (
    <NavigationContainer>
      {showMain ? <MainTabs /> : showSetup ? <SetupStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
