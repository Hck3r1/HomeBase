import { Platform } from 'react-native';
import Constants from 'expo-constants';

const API_PORT = 4000;
const API_PATH = '/api/v1';

function devHostFromExpo(): string | undefined {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) return hostUri.split(':')[0];

  const debuggerHost = Constants.expoGoConfig?.debuggerHost;
  if (debuggerHost) return debuggerHost.split(':')[0];

  return undefined;
}

export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, '');

  const devHost = devHostFromExpo();
  if (devHost) return `http://${devHost}:${API_PORT}${API_PATH}`;

  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}${API_PATH}`;

  return `http://localhost:${API_PORT}${API_PATH}`;
}
