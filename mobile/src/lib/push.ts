import { NativeModules, Platform } from 'react-native';
import { registerPushToken } from './authApi';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;
let handlerConfigured = false;

export function pushNotificationsNativeAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  return Boolean(NativeModules.ExpoPushTokenManager);
}

function isPhysicalDevice(): boolean {
  if (Platform.OS === 'web') return false;
  if (!NativeModules.ExpoDevice) return pushNotificationsNativeAvailable();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Device = require('expo-device') as typeof import('expo-device');
    return Device.isDevice;
  } catch {
    return false;
  }
}

function getExpoProjectId(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default as typeof import('expo-constants').default;
    return (
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.projectId
    );
  } catch {
    return undefined;
  }
}

function getNotifications(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;
  if (!pushNotificationsNativeAvailable()) {
    notificationsModule = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications') as NotificationsModule;
    if (!handlerConfigured) {
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      handlerConfigured = true;
    }
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}

export interface MessageNotificationData {
  type: 'message_new';
  conversationId: string;
  listingTitle?: string;
}

export function parseMessageNotificationData(
  data: Record<string, unknown> | undefined,
): MessageNotificationData | null {
  if (!data || data.type !== 'message_new') return null;
  const conversationId = data.conversationId;
  if (typeof conversationId !== 'string' || !conversationId) return null;
  return {
    type: 'message_new',
    conversationId,
    listingTitle: typeof data.listingTitle === 'string' ? data.listingTitle : undefined,
  };
}

async function ensureAndroidChannel(Notifications: NotificationsModule) {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Messages',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3B7A6F',
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!pushNotificationsNativeAvailable() || !isPhysicalDevice()) return null;

  const Notifications = getNotifications();
  if (!Notifications) return null;

  try {
    await ensureAndroidChannel(Notifications);

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = getExpoProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResponse.data;
  } catch {
    return null;
  }
}

export async function syncPushTokenWithBackend(): Promise<void> {
  if (!pushNotificationsNativeAvailable()) return;

  try {
    const expoToken = await registerForPushNotifications();
    if (!expoToken || Platform.OS === 'web') return;
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await registerPushToken(expoToken, platform);
  } catch {
    // Push is optional until the native app is rebuilt with expo-notifications.
  }
}

export function getNotificationsModule(): NotificationsModule | null {
  return getNotifications();
}
