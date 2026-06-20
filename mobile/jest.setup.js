jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children, style }: { children?: React.ReactNode; style?: object }) =>
      React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('expo-glass-effect', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GlassView: ({ children, style }: { children?: React.ReactNode; style?: object }) =>
      React.createElement(View, { style }, children),
    GlassContainer: ({ children, style }: { children?: React.ReactNode; style?: object }) =>
      React.createElement(View, { style }, children),
    isLiquidGlassAvailable: () => false,
    isGlassEffectAPIAvailable: () => false,
  };
});

jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BlurView: ({ children, style }: { children?: React.ReactNode; style?: object }) =>
      React.createElement(View, { style }, children),
  };
});

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: { testID?: string }) => React.createElement(View, { testID: props.testID ?? 'date-picker' }),
  };
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMap = (props: { children?: React.ReactNode }) =>
    React.createElement(View, { testID: 'map-view' }, props.children);
  return {
    __esModule: true,
    default: MockMap,
    Marker: (props: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'map-marker' }, props.children),
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('react-native-map-clustering', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'cluster-map' }, props.children),
  };
});

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props: { name?: string }) => React.createElement(Text, null, props.name),
  };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images' },
}));

global.fetch = jest.fn(async () => ({ ok: true }));

jest.mock('./src/lib/bareApi', () => ({
  bareApi: {
    get: jest.fn().mockRejectedValue(new Error('offline')),
    post: jest.fn(),
  },
}));

jest.mock('./src/lib/api', () => {
  const actual = jest.requireActual('./src/lib/api');
  return {
    ...actual,
    api: {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    },
  };
});
