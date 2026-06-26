import { CommonActions, NavigationProp, ParamListBase } from '@react-navigation/native';

export type HomeStackScreen =
  | 'HomeFeed'
  | 'SearchResults'
  | 'MapView'
  | 'ListingDetail'
  | 'SearchFilters'
  | 'PhotoGallery'
  | 'Conversations'
  | 'Notifications'
  | 'Chat';

/** Navigate to a screen inside the Home tab's ListingsStack from any tab. */
export function navigateHomeStack(
  navigation: NavigationProp<ParamListBase>,
  screen: HomeStackScreen,
  params?: Record<string, unknown>,
) {
  const action = CommonActions.navigate({
    name: 'Home',
    params: {
      screen,
      params,
      initial: false,
    },
  });

  let current: NavigationProp<ParamListBase> | undefined = navigation;
  while (current) {
    const routeNames = current.getState()?.routeNames ?? [];
    if (routeNames.includes('Home') && routeNames.includes('Map')) {
      current.dispatch(action);
      return;
    }
    current = current.getParent();
  }

  navigation.dispatch(action);
}
