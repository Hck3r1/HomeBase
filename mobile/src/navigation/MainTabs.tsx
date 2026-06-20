import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ListingsStack } from './ListingsStack';
import { ListerStack } from './ListerStack';
import { MainTabBar } from './MainTabBar';
import { MapViewScreen } from '../screens/listings/MapViewScreen';
import { SavedScreen } from '../screens/main/SavedScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { useAuthStore } from '../store/authStore';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  const role = useAuthStore((s) => s.user?.role);
  const isLister = role === 'lister';

  return (
    <Tab.Navigator
      tabBar={(props) => <MainTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={ListingsStack}
        options={{ tabBarLabel: 'Home', lazy: false }}
      />
      <Tab.Screen
        name="Map"
        component={MapViewScreen}
        options={{ tabBarLabel: 'Map' }}
      />
      {isLister ? (
        <Tab.Screen
          name="Listings"
          component={ListerStack}
          options={{ tabBarLabel: 'Listings' }}
        />
      ) : (
        <Tab.Screen
          name="Saved"
          component={SavedScreen}
          options={{ tabBarLabel: 'Saved' }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}
