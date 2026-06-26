import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  connectSocket,
  ensureSocketConnected,
  getSocket,
  subscribeMessageNew,
  subscribeMessageRead,
  subscribeTyping,
} from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import { conversationsKey, Message, messagesKey } from '../api/messaging';

export function useChatSocket(conversationId: string) {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!token || !conversationId) return;

    const socket = connectSocket(token);

    const join = () => socket.emit('conversation:join', conversationId);
    socket.on('connect', join);

    const unsubNew = subscribeMessageNew((message) => {
      const msg = message as Message;
      if (msg.conversationId !== conversationId) return;
      qc.setQueryData<Message[]>(messagesKey(conversationId), (old = []) =>
        old.some((m) => m.id === msg.id) ? old : [...old, msg],
      );
      void qc.invalidateQueries({ queryKey: conversationsKey });
    });

    const unsubTyping = subscribeTyping(({ userId, isTyping }) =>
      setTypingUserIds((prev) =>
        isTyping ? Array.from(new Set([...prev, userId])) : prev.filter((u) => u !== userId),
      ),
    );

    const unsubRead = subscribeMessageRead(() => {
      void qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
      void qc.invalidateQueries({ queryKey: conversationsKey });
    });

    ensureSocketConnected();
    if (socket.connected) join();

    return () => {
      socket.off('connect', join);
      unsubNew();
      unsubTyping();
      unsubRead();
    };
  }, [token, conversationId, qc]);

  const sendTyping = useCallback(
    (isTyping: boolean) => getSocket()?.emit('typing', { conversationId, isTyping }),
    [conversationId],
  );

  const markRead = useCallback(
    () => getSocket()?.emit('message:read', { conversationId }),
    [conversationId],
  );

  return { typingUserIds, sendTyping, markRead };
}
