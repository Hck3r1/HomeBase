import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  getNotificationsModule,
  parseMessageNotificationData,
  pushNotificationsNativeAvailable,
  syncPushTokenWithBackend,
} from '../lib/push';
import { navigationRef } from '../navigation/navigationRef';
import { navigateHomeStack } from '../navigation/homeStackNavigation';

function openMessageFromNotification(data: Record<string, unknown> | undefined) {
  const parsed = parseMessageNotificationData(data);
  if (!parsed) return;

  const navigate = () => {
    if (!navigationRef.isReady()) return false;
    navigateHomeStack(navigationRef, 'Chat', {
      conversationId: parsed.conversationId,
      title: parsed.listingTitle ?? 'Message',
    });
    return true;
  };

  if (navigate()) return;

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (navigate() || attempts > 20) clearInterval(timer);
  }, 100);
}

export function usePushNotifications(enabled: boolean) {
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!enabled || !accessToken || !pushNotificationsNativeAvailable()) return;
    void syncPushTokenWithBackend().catch(() => undefined);
  }, [enabled, accessToken]);

  useEffect(() => {
    if (!enabled) return;

    const Notifications = getNotificationsModule();
    if (!Notifications) return;

    let subResponse: { remove: () => void } | undefined;

    try {
      subResponse = Notifications.addNotificationResponseReceivedListener((response) => {
        openMessageFromNotification(response.notification.request.content.data as Record<string, unknown>);
      });

      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response) return;
        openMessageFromNotification(response.notification.request.content.data as Record<string, unknown>);
      });
    } catch {
      return undefined;
    }

    return () => {
      subResponse?.remove();
    };
  }, [enabled]);
}
