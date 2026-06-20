import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileSetupScreen } from '../screens/setup/ProfileSetupScreen';
import { RoleSetupScreen } from '../screens/setup/RoleSetupScreen';
import { PreferencesSetupScreen } from '../screens/setup/PreferencesSetupScreen';
import { KycIntroScreen } from '../screens/setup/KycIntroScreen';
import { useAuthStore } from '../store/authStore';
import { getSetupResumeRoute } from '../lib/setupResume';

export type SetupStackParamList = {
  ProfileSetup: undefined;
  RoleSetup: undefined;
  PreferencesSetup: undefined;
  KycIntro: undefined;
};

const Stack = createNativeStackNavigator<SetupStackParamList>();

export function SetupStack() {
  const user = useAuthStore((s) => s.user);
  const initialRoute = getSetupResumeRoute(user);

  return (
    <Stack.Navigator
      key={initialRoute}
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="RoleSetup" component={RoleSetupScreen} />
      <Stack.Screen name="PreferencesSetup" component={PreferencesSetupScreen} />
      <Stack.Screen name="KycIntro" component={KycIntroScreen} />
    </Stack.Navigator>
  );
}
