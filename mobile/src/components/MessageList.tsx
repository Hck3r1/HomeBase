import React, { useCallback, useEffect, useRef } from 'react';
import { FlatList } from 'react-native';
import { MessageBubble } from './MessageBubble';
import { Message } from '../api/messaging';
import { theme } from '../theme';

export function MessageList({ messages, currentUserId }: { messages: Message[]; currentUserId: string }) {
  const listRef = useRef<FlatList<Message>>(null);

  const scrollToLatest = useCallback((animated = false) => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, [messages.length]);

  useEffect(() => {
    scrollToLatest(false);
  }, [messages, scrollToLatest]);

  return (
    <FlatList
      ref={listRef}
      testID="message-list"
      style={{ flex: 1 }}
      data={messages}
      keyExtractor={(m) => m.id}
      contentContainerStyle={{ paddingHorizontal: theme.spacing(2), paddingVertical: theme.spacing(1.5) }}
      renderItem={({ item }) => <MessageBubble message={item} mine={item.senderId === currentUserId} />}
      onContentSizeChange={() => scrollToLatest(false)}
      onLayout={() => scrollToLatest(false)}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    />
  );
}
