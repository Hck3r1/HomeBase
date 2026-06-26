const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Remote push requires a paid Apple Developer account.
 * Strip the push entitlement for local/free-team builds unless explicitly enabled.
 *
 * Enable later with: EXPO_PUBLIC_IOS_PUSH=true npx expo prebuild --platform ios
 */
module.exports = function withOptionalIosPush(config) {
  const enabled = process.env.EXPO_PUBLIC_IOS_PUSH === 'true';

  return withEntitlementsPlist(config, (config) => {
    if (!enabled) {
      delete config.modResults['aps-environment'];
    } else if (!config.modResults['aps-environment']) {
      config.modResults['aps-environment'] = 'development';
    }
    return config;
  });
};
