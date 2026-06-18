module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^test-renderer$': 'react-test-renderer',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|react-native-svg))',
  ],
};
