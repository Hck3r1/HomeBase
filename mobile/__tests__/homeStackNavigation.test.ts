import { CommonActions } from '@react-navigation/native';
import { navigateHomeStack } from '../src/navigation/homeStackNavigation';

describe('navigateHomeStack', () => {
  it('dispatches nested Home stack navigation on the tab navigator', () => {
    const dispatch = jest.fn();
    const tabNav = {
      getState: () => ({ routeNames: ['Home', 'Map', 'Saved', 'Profile'] }),
      dispatch,
      getParent: () => undefined,
    };
    const mapNav = {
      getState: () => ({ routeNames: ['Map'] }),
      dispatch: jest.fn(),
      getParent: () => tabNav,
    };

    navigateHomeStack(mapNav as never, 'SearchResults');

    expect(dispatch).toHaveBeenCalledWith(
      CommonActions.navigate({
        name: 'Home',
        params: { screen: 'SearchResults', params: undefined, initial: false },
      }),
    );
  });
});
