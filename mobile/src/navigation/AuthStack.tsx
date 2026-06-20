import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { WalkthroughScreen } from '../screens/auth/WalkthroughScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { LogInScreen } from '../screens/auth/LogInScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ForgotPasswordOtpScreen } from '../screens/auth/ForgotPasswordOtpScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { useAuthStore } from '../store/authStore';

export type AuthStackParamList = {
  Splash: undefined;
  Walkthrough: undefined;
  SignUp: undefined;
  LogIn: undefined;
  ForgotPassword: undefined;
  ForgotPasswordOtp: { email: string };
  ResetPassword: { email: string; resetToken: string };
  RoleSelect: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

function authEntryRoute(splashFinished: boolean, showOnboarding: boolean): keyof AuthStackParamList {
  if (!splashFinished) return 'Splash';
  return showOnboarding ? 'Walkthrough' : 'LogIn';
}

export function AuthStack() {
  const splashFinished = useAuthStore((s) => s.splashFinished);
  const showOnboarding = useAuthStore((s) => s.showOnboarding);

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={authEntryRoute(splashFinished, showOnboarding)}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Walkthrough" component={WalkthroughScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="LogIn" component={LogInScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ForgotPasswordOtp" component={ForgotPasswordOtpScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}
