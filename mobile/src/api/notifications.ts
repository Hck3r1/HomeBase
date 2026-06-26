import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

interface NotificationsResponse {
  items?: unknown[];
  unreadCount?: number;
}

export function useNotificationUnreadCount() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated());

  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      try {
        const { data } = await api.get<NotificationsResponse>('/notifications');
        return data.unreadCount ?? 0;
      } catch {
        return 0;
      }
    },
    enabled: isAuthed,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
