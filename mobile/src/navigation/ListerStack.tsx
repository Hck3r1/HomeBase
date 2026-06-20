import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyListingsScreen } from '../screens/lister/MyListingsScreen';
import { CreateListingScreen } from '../screens/lister/CreateListingScreen';
import { EditListingScreen } from '../screens/lister/EditListingScreen';

const Stack = createNativeStackNavigator();

export function ListerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyListings" component={MyListingsScreen} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} />
      <Stack.Screen name="EditListing" component={EditListingScreen} />
    </Stack.Navigator>
  );
}
