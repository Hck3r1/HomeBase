import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  connectSocket,
  ensureSocketConnected,
  subscribeMessageNew,
  subscribeMessageRead,
} from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import { conversationsKey } from '../api/messaging';

export function useConversationsRealtime() {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  useEffect(() => {
    if (!token) return;

    connectSocket(token);
    ensureSocketConnected();

    const refresh = () => {
      void qc.invalidateQueries({ queryKey: conversationsKey });
    };

    const unsubNew = subscribeMessageNew(refresh);
    const unsubRead = subscribeMessageRead(refresh);

    return () => {
      unsubNew();
      unsubRead();
    };
  }, [token, qc]);
}
