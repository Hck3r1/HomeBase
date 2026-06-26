import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeFeedScreen } from '../screens/listings/HomeFeedScreen';
import { SearchResultsScreen } from '../screens/listings/SearchResultsScreen';
import { SearchFiltersSheet } from '../screens/listings/SearchFiltersSheet';
import { MapViewScreen } from '../screens/listings/MapViewScreen';
import { ListingDetailScreen } from '../screens/listings/ListingDetailScreen';
import { ConversationsScreen } from '../screens/messaging/ConversationsScreen';
import { ChatScreen } from '../screens/messaging/ChatScreen';
import { NotificationsScreen } from '../screens/main/NotificationsScreen';
import { PhotoGalleryScreen } from '../screens/listings/PhotoGalleryScreen';

const Stack = createNativeStackNavigator();

export function ListingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeFeed" component={HomeFeedScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="MapView" component={MapViewScreen} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
      <Stack.Screen name="Conversations" component={ConversationsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="SearchFilters" component={SearchFiltersSheet} />
        <Stack.Screen name="PhotoGallery" component={PhotoGalleryScreen} />
      </Stack.Group>
    </Stack.Navigator>
  );
}
