import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomePlaceholderScreen } from '../screens/main/HomePlaceholderScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary }}>
      <Tab.Screen name="Home" component={HomePlaceholderScreen} />
    </Tab.Navigator>
  );
}
