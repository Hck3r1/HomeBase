# Phase 3 — Favorites & Messaging (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the saved-listings (favorites) and in-app chat experience — a reusable heart `FavoriteButton` with optimistic toggling, a Saved screen, a Conversations list, and a realtime Chat thread (message bubbles, input bar, typing indicator, read receipts) — all wired to the Phase 3 backend over React Query + Socket.IO, in the teal design system.

**Architecture:** React Query hooks in `src/api/favorites.ts` (`useFavorites`, `useToggleFavorite` with optimistic cache updates) and `src/api/messaging.ts` (`useConversations`, `useMessages`, `useSendMessage`). A `src/lib/socket.ts` module owns one authenticated `socket.io-client` instance (token from `useAuthStore`); `useChatSocket(conversationId)` joins the conversation room, folds incoming `message:new` into the messages cache, tracks `typing`, and exposes `sendTyping`/`markRead`. Screens live under `src/screens/` and use the existing `Screen`/`Button`/`AppTextInput` primitives plus a small `MessageList`/`MessageBubble`/`FavoriteButton` component set.

**Tech Stack:** Expo, React Native, TypeScript, React Navigation, React Query, Zustand, Axios, `socket.io-client`, Jest (jest-expo) + @testing-library/react-native.

> **Note on git:** Each task ends with a commit run in your own terminal. Assumes Phases 0–2 frontend complete (theme, `Button`, `AppTextInput`, `Screen`, `ListingCard`, `useAuthStore`, `api`, `queryClient`, navigation shell, listing detail).

> All paths relative to `mobile/`.

---

## File Structure (created/modified this phase)

```
mobile/
└── src/
    ├── api/favorites.ts                       # useFavorites, useToggleFavorite (optimistic)
    ├── api/messaging.ts                       # useConversations, useMessages, useSendMessage
    ├── lib/socket.ts                          # authenticated socket.io-client singleton
    ├── hooks/useChatSocket.ts                 # join room, realtime message:new/typing/read
    ├── components/FavoriteButton.tsx          # reusable heart toggle
    ├── components/MessageBubble.tsx
    ├── components/MessageList.tsx
    ├── components/ConversationRow.tsx
    ├── components/ListingCard.tsx             # MODIFY: overlay FavoriteButton
    ├── screens/SavedScreen.tsx
    ├── screens/ConversationsScreen.tsx
    ├── screens/ChatScreen.tsx
    └── navigation/                            # MODIFY: register Saved/Conversations/Chat
__tests__/
    ├── FavoriteButton.test.tsx
    └── MessageList.test.tsx
```

---

## Task 1: Favorites API hooks (optimistic toggle)

**Files:**
- Create: `mobile/src/api/favorites.ts`

- [ ] **Step 1: Implement `src/api/favorites.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface FavoriteListing {
  id: string;
  title: string;
  listingType: 'rent' | 'sale' | 'shortstay';
  city?: string;
  photos?: { id: string; url: string }[];
  rent?: { annualRent?: number | null; monthlyRent?: number | null } | null;
  sale?: { salePrice: number } | null;
  shortstay?: { nightlyRate: number } | null;
}

export interface Favorite {
  id: string;
  listingId: string;
  listing: FavoriteListing;
}

export const favoritesKey = ['favorites'] as const;

export function useFavorites() {
  return useQuery({
    queryKey: favoritesKey,
    queryFn: async () => (await api.get<Favorite[]>('/favorites')).data,
  });
}

export function useIsFavorite(listingId: string) {
  const { data } = useFavorites();
  return Boolean(data?.some((f) => f.listingId === listingId));
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, isFavorited }: { listingId: string; isFavorited: boolean }) => {
      if (isFavorited) {
        await api.delete(`/favorites/${listingId}`);
      } else {
        await api.post(`/favorites/${listingId}`);
      }
      return { listingId, isFavorited: !isFavorited };
    },
    onMutate: async ({ listingId, isFavorited }) => {
      await qc.cancelQueries({ queryKey: favoritesKey });
      const previous = qc.getQueryData<Favorite[]>(favoritesKey) ?? [];
      qc.setQueryData<Favorite[]>(favoritesKey, (old = []) =>
        isFavorited
          ? old.filter((f) => f.listingId !== listingId)
          : [
              ...old,
              { id: `optimistic-${listingId}`, listingId, listing: { id: listingId, title: '', listingType: 'rent' } },
            ],
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(favoritesKey, ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: favoritesKey });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/api/favorites.ts
git commit -m "feat(mobile): favorites react-query hooks with optimistic toggle"
```

---

## Task 2: FavoriteButton component + optimistic toggle test

**Files:**
- Create: `mobile/src/components/FavoriteButton.tsx`
- Test: `mobile/__tests__/FavoriteButton.test.tsx`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/FavoriteButton.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FavoriteButton } from '../src/components/FavoriteButton';
import { api } from '../src/lib/api';

jest.spyOn(api, 'get').mockResolvedValue({ data: [] } as any);
jest.spyOn(api, 'post').mockResolvedValue({ data: { id: 'f1', listingId: 'L1' } } as any);
jest.spyOn(api, 'delete').mockResolvedValue({ data: {} } as any);

function renderButton() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['favorites'], []);
  return render(
    <QueryClientProvider client={client}>
      <FavoriteButton listingId="L1" />
    </QueryClientProvider>,
  );
}

describe('FavoriteButton', () => {
  it('optimistically flips to favorited on press', async () => {
    const { getByRole } = renderButton();
    const button = getByRole('button');
    expect(button.props.accessibilityState.selected).toBe(false);
    fireEvent.press(button);
    // Optimistic update flips the heart before the network settles.
    await waitFor(() => expect(getByRole('button').props.accessibilityState.selected).toBe(true));
    expect(api.post).toHaveBeenCalledWith('/favorites/L1');
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npm test -- FavoriteButton` → FAIL.

- [ ] **Step 3: Implement `FavoriteButton.tsx`**

```tsx
import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { useIsFavorite, useToggleFavorite } from '../api/favorites';
import { theme } from '../theme';

interface Props {
  listingId: string;
  size?: number;
  style?: ViewStyle;
}

export function FavoriteButton({ listingId, size = 22, style }: Props) {
  const isFavorited = useIsFavorite(listingId);
  const toggle = useToggleFavorite();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isFavorited ? 'Remove from saved' : 'Save listing'}
      accessibilityState={{ selected: isFavorited }}
      onPress={() => toggle.mutate({ listingId, isFavorited })}
      style={[styles.btn, style]}
      hitSlop={8}
    >
      <Text style={{ fontSize: size, color: isFavorited ? theme.colors.primary : theme.colors.muted }}>
        {isFavorited ? '\u2665' : '\u2661'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
});
```

- [ ] **Step 4: Run test (passes)** → `npm test -- FavoriteButton` → PASS.

- [ ] **Step 5: Overlay it on `ListingCard`**

In `mobile/src/components/ListingCard.tsx`, import the button and render it as an absolute overlay on the card image (keep existing card content):
```tsx
import { FavoriteButton } from './FavoriteButton';
// ...inside the image/header container, as a sibling overlay:
<FavoriteButton listingId={listing.id} style={{ position: 'absolute', top: 8, right: 8 }} />
```

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/FavoriteButton.tsx mobile/src/components/ListingCard.tsx mobile/__tests__/FavoriteButton.test.tsx
git commit -m "feat(mobile): reusable heart FavoriteButton with optimistic toggle"
```

---

## Task 3: Saved (favorites) screen

**Files:**
- Create: `mobile/src/screens/SavedScreen.tsx`

- [ ] **Step 1: Implement `SavedScreen.tsx`**

```tsx
import React from 'react';
import { FlatList, Text, View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Screen } from '../components/Screen';
import { FavoriteButton } from '../components/FavoriteButton';
import { useFavorites } from '../api/favorites';
import { theme } from '../theme';

export function SavedScreen({ navigation }: any) {
  const { data, isLoading } = useFavorites();

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing(6) }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Saved</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(f) => f.id}
        ListEmptyComponent={<Text style={styles.empty}>You haven&apos;t saved any listings yet.</Text>}
        contentContainerStyle={{ paddingBottom: theme.spacing(6) }}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('ListingDetail', { id: item.listingId })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{item.listing.title || 'Listing'}</Text>
              <Text style={styles.rowMeta}>{item.listing.city ?? item.listing.listingType}</Text>
            </View>
            <FavoriteButton listingId={item.listingId} />
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginVertical: theme.spacing(2) },
  empty: { color: theme.colors.muted, marginTop: theme.spacing(6), textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.md,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(1.5),
  },
  rowTitle: { fontSize: theme.font.sizeMd, fontWeight: theme.font.weightSemibold, color: theme.colors.ink },
  rowMeta: { color: theme.colors.muted, marginTop: 2 },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/SavedScreen.tsx
git commit -m "feat(mobile): saved/favorites screen"
```

---

## Task 4: Messaging API hooks

**Files:**
- Create: `mobile/src/api/messaging.ts`

- [ ] **Step 1: Implement `src/api/messaging.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationParticipant {
  userId: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

export interface Conversation {
  id: string;
  listingId: string;
  participants: ConversationParticipant[];
  listing: { id: string; title: string; listingType: string; photos: { id: string; url: string }[] };
  messages: Message[];
  updatedAt: string;
}

export const conversationsKey = ['conversations'] as const;
export const messagesKey = (id: string) => ['messages', id] as const;

export function useConversations() {
  return useQuery({
    queryKey: conversationsKey,
    queryFn: async () => (await api.get<Conversation[]>('/conversations')).data,
  });
}

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: messagesKey(conversationId),
    queryFn: async () => (await api.get<Message[]>(`/conversations/${conversationId}/messages`)).data,
    enabled: Boolean(conversationId),
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  return useMutation({
    mutationFn: async (body: string) =>
      (await api.post<Message>(`/conversations/${conversationId}/messages`, { body })).data,
    onMutate: async (body: string) => {
      await qc.cancelQueries({ queryKey: messagesKey(conversationId) });
      const previous = qc.getQueryData<Message[]>(messagesKey(conversationId)) ?? [];
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        conversationId,
        senderId: userId,
        body,
        readAt: null,
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData<Message[]>(messagesKey(conversationId), [...previous, optimistic]);
      return { previous };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) qc.setQueryData(messagesKey(conversationId), ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/api/messaging.ts
git commit -m "feat(mobile): conversations + messages react-query hooks"
```

---

## Task 5: Socket.IO client wiring + useChatSocket

**Files:**
- Create: `mobile/src/lib/socket.ts`
- Create: `mobile/src/hooks/useChatSocket.ts`

- [ ] **Step 1: Install the client**

Run: `cd ~/Projects/HomeBase/mobile && npm install socket.io-client`

- [ ] **Step 2: Implement `src/lib/socket.ts`**

```ts
import { io, Socket } from 'socket.io-client';
import { api } from './api';

let socket: Socket | null = null;

function socketUrl(): string {
  const base = api.defaults.baseURL ?? 'http://localhost:4000/api/v1';
  return base.replace(/\/api\/v1\/?$/, '');
}

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();
  socket = io(socketUrl(), {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    forceNew: true,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
```

- [ ] **Step 3: Implement `src/hooks/useChatSocket.ts`**

```ts
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, getSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import { Message, messagesKey } from '../api/messaging';

export function useChatSocket(conversationId: string) {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!token || !conversationId) return;
    const socket = connectSocket(token);

    const join = () => socket.emit('conversation:join', conversationId);
    if (socket.connected) join();
    socket.on('connect', join);

    const onNew = (message: Message) => {
      if (message.conversationId !== conversationId) return;
      qc.setQueryData<Message[]>(messagesKey(conversationId), (old = []) =>
        old.some((m) => m.id === message.id) ? old : [...old, message],
      );
    };
    const onTyping = ({ userId, isTyping }: { userId: string; isTyping: boolean }) =>
      setTypingUserIds((prev) =>
        isTyping ? Array.from(new Set([...prev, userId])) : prev.filter((u) => u !== userId),
      );
    const onRead = () => {
      void qc.invalidateQueries({ queryKey: messagesKey(conversationId) });
    };

    socket.on('message:new', onNew);
    socket.on('typing', onTyping);
    socket.on('message:read', onRead);

    return () => {
      socket.off('connect', join);
      socket.off('message:new', onNew);
      socket.off('typing', onTyping);
      socket.off('message:read', onRead);
    };
  }, [token, conversationId, qc]);

  const sendTyping = (isTyping: boolean) => getSocket()?.emit('typing', { conversationId, isTyping });
  const markRead = () => getSocket()?.emit('message:read', { conversationId });

  return { typingUserIds, sendTyping, markRead };
}
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/lib/socket.ts mobile/src/hooks/useChatSocket.ts mobile/package.json
git commit -m "feat(mobile): authenticated socket.io client + useChatSocket hook"
```

---

## Task 6: Conversations list screen

**Files:**
- Create: `mobile/src/components/ConversationRow.tsx`
- Create: `mobile/src/screens/ConversationsScreen.tsx`

- [ ] **Step 1: Implement `ConversationRow.tsx`**

```tsx
import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Conversation } from '../api/messaging';
import { theme } from '../theme';

interface Props {
  conversation: Conversation;
  currentUserId: string;
  onPress: () => void;
}

export function ConversationRow({ conversation, currentUserId, onPress }: Props) {
  const other = conversation.participants.find((p) => p.userId !== currentUserId)?.user;
  const last = conversation.messages[0];
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(other?.name ?? '?').charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{other?.name ?? 'Conversation'}</Text>
        <Text style={styles.preview} numberOfLines={1}>
          {last?.body ?? `About: ${conversation.listing.title}`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing(1.5) },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: theme.colors.chip,
    alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing(1.5),
  },
  avatarText: { color: theme.colors.primary, fontWeight: theme.font.weightBold, fontSize: theme.font.sizeMd },
  name: { fontSize: theme.font.sizeMd, fontWeight: theme.font.weightSemibold, color: theme.colors.ink },
  preview: { color: theme.colors.muted, marginTop: 2 },
});
```

- [ ] **Step 2: Implement `ConversationsScreen.tsx`**

```tsx
import React from 'react';
import { FlatList, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Screen } from '../components/Screen';
import { ConversationRow } from '../components/ConversationRow';
import { useConversations } from '../api/messaging';
import { useAuthStore } from '../store/authStore';
import { theme } from '../theme';

export function ConversationsScreen({ navigation }: any) {
  const { data, isLoading } = useConversations();
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing(6) }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Messages</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={<Text style={styles.empty}>No conversations yet.</Text>}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            currentUserId={currentUserId}
            onPress={() => navigation.navigate('Chat', { conversationId: item.id, title: item.listing.title })}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginVertical: theme.spacing(2) },
  empty: { color: theme.colors.muted, marginTop: theme.spacing(6), textAlign: 'center' },
});
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/ConversationRow.tsx mobile/src/screens/ConversationsScreen.tsx
git commit -m "feat(mobile): conversations list screen"
```

---

## Task 7: Chat thread (bubbles, input bar, typing, read receipts) + render test

**Files:**
- Create: `mobile/src/components/MessageBubble.tsx`
- Create: `mobile/src/components/MessageList.tsx`
- Create: `mobile/src/screens/ChatScreen.tsx`
- Test: `mobile/__tests__/MessageList.test.tsx`

- [ ] **Step 1: Implement `MessageBubble.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Message } from '../api/messaging';
import { theme } from '../theme';

export function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  return (
    <View style={[styles.wrap, mine ? styles.mineWrap : styles.theirsWrap]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.body, mine && { color: theme.colors.white }]}>{message.body}</Text>
      </View>
      {mine && message.readAt && <Text style={styles.receipt}>Read</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 4, maxWidth: '80%' },
  mineWrap: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirsWrap: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 16 },
  mine: { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: theme.colors.card, borderBottomLeftRadius: 4 },
  body: { fontSize: theme.font.sizeSm, color: theme.colors.ink },
  receipt: { fontSize: 11, color: theme.colors.muted, marginTop: 2, marginRight: 4 },
});
```

- [ ] **Step 2: Implement `MessageList.tsx`**

```tsx
import React from 'react';
import { FlatList } from 'react-native';
import { MessageBubble } from './MessageBubble';
import { Message } from '../api/messaging';
import { theme } from '../theme';

export function MessageList({ messages, currentUserId }: { messages: Message[]; currentUserId: string }) {
  return (
    <FlatList
      testID="message-list"
      data={messages}
      keyExtractor={(m) => m.id}
      contentContainerStyle={{ padding: theme.spacing(2) }}
      renderItem={({ item }) => <MessageBubble message={item} mine={item.senderId === currentUserId} />}
    />
  );
}
```

- [ ] **Step 3: Write the failing render test**

`mobile/__tests__/MessageList.test.tsx`:
```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { MessageList } from '../src/components/MessageList';
import { Message } from '../src/api/messaging';

const messages: Message[] = [
  { id: '1', conversationId: 'c1', senderId: 'me', body: 'Hi there', readAt: null, createdAt: '2026-06-19T10:00:00Z' },
  { id: '2', conversationId: 'c1', senderId: 'them', body: 'Hello!', readAt: '2026-06-19T10:01:00Z', createdAt: '2026-06-19T10:01:00Z' },
];

describe('MessageList', () => {
  it('renders every message bubble', () => {
    const { getByText, getByTestId } = render(<MessageList messages={messages} currentUserId="me" />);
    expect(getByTestId('message-list')).toBeTruthy();
    expect(getByText('Hi there')).toBeTruthy();
    expect(getByText('Hello!')).toBeTruthy();
  });
});
```

- [ ] **Step 4: Run test (passes)** → `npm test -- MessageList` → PASS.

- [ ] **Step 5: Implement `ChatScreen.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { MessageList } from '../components/MessageList';
import { useMessages, useSendMessage } from '../api/messaging';
import { useChatSocket } from '../hooks/useChatSocket';
import { useAuthStore } from '../store/authStore';
import { theme } from '../theme';

export function ChatScreen({ route }: any) {
  const { conversationId } = route.params;
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');
  const { data: messages } = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  const { typingUserIds, sendTyping, markRead } = useChatSocket(conversationId);
  const [text, setText] = useState('');

  useEffect(() => {
    if ((messages?.length ?? 0) > 0) markRead();
  }, [messages?.length, markRead]);

  function onChange(value: string) {
    setText(value);
    sendTyping(value.length > 0);
  }

  function submit() {
    const body = text.trim();
    if (!body) return;
    send.mutate(body);
    setText('');
    sendTyping(false);
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <MessageList messages={messages ?? []} currentUserId={currentUserId} />
      {typingUserIds.length > 0 && <Text style={styles.typing}>Typing…</Text>}
      <View style={styles.bar}>
        <TextInput
          style={styles.input}
          placeholder="Message"
          placeholderTextColor={theme.colors.muted}
          value={text}
          onChangeText={onChange}
          multiline
        />
        <Pressable style={styles.send} onPress={submit} accessibilityRole="button" accessibilityLabel="Send">
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.white },
  typing: { color: theme.colors.muted, fontStyle: 'italic', paddingHorizontal: theme.spacing(2), paddingBottom: 4 },
  bar: {
    flexDirection: 'row', alignItems: 'flex-end', padding: theme.spacing(1.5),
    borderTopWidth: 1, borderTopColor: theme.colors.line,
  },
  input: {
    flex: 1, maxHeight: 120, backgroundColor: theme.colors.card, borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing(1.5), paddingVertical: theme.spacing(1), color: theme.colors.ink,
  },
  send: {
    marginLeft: theme.spacing(1), backgroundColor: theme.colors.primary, borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing(2.5), paddingVertical: theme.spacing(1.25), alignItems: 'center', justifyContent: 'center',
  },
  sendText: { color: theme.colors.white, fontWeight: theme.font.weightSemibold },
});
```

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/MessageBubble.tsx mobile/src/components/MessageList.tsx mobile/src/screens/ChatScreen.tsx mobile/__tests__/MessageList.test.tsx
git commit -m "feat(mobile): chat thread with bubbles, input bar, typing + read receipts"
```

---

## Task 8: Wire navigation + full suite green

**Files:**
- Modify: `mobile/src/navigation/` (the app's stack/tab navigators)

- [ ] **Step 1: Register the screens**

Add the three screens to the appropriate navigators (keep existing screens):
- A **Saved** tab → `SavedScreen` in the bottom tab navigator.
- A **Messages** tab (or entry) → `ConversationsScreen`.
- A `Chat` route → `ChatScreen` in the root/home stack so it can be pushed from `ConversationsScreen` and from listing detail.

Example stack additions:
```tsx
import { SavedScreen } from '../screens/SavedScreen';
import { ConversationsScreen } from '../screens/ConversationsScreen';
import { ChatScreen } from '../screens/ChatScreen';
// ...
<Stack.Screen name="Conversations" component={ConversationsScreen} options={{ title: 'Messages' }} />
<Stack.Screen name="Chat" component={ChatScreen} options={({ route }: any) => ({ title: route.params?.title ?? 'Chat' })} />
```

For the bottom tabs, add `Saved` and `Messages` entries pointing at `SavedScreen` and `ConversationsScreen`.

- [ ] **Step 2: Add a "Message lister" entry on listing detail**

On the listing detail screen, add a button that creates/opens a conversation about the listing and navigates to `Chat`:
```tsx
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
// ...
const startChat = useMutation({
  mutationFn: async (listingId: string) => (await api.post('/conversations', { listingId })).data,
  onSuccess: (c: any) => navigation.navigate('Chat', { conversationId: c.id, title: c.listing.title }),
});
// ...render a Button: <Button label="Message lister" onPress={() => startChat.mutate(listing.id)} />
```

- [ ] **Step 3: Run the full suite** → `npm test` → all PASS.

- [ ] **Step 4: Manual smoke check**

Run: `npx expo start` → open a listing → tap the heart (saved instantly, persists in Saved tab) → tap "Message lister" → send a message and watch it appear; with a second device/account the message arrives in realtime, the typing indicator shows while the other types, and "Read" appears after the recipient opens the thread.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/navigation mobile/src/screens
git commit -m "feat(mobile): wire saved, conversations, and chat into navigation"
```

---

## Self-Review (against spec §5.2 favorites, §5.4 messaging, §11 Design System, screens 20–21 + 33)

- **Favorites hooks (`useFavorites`, `useToggleFavorite` optimistic):** Task 1. ✓
- **Reusable heart `FavoriteButton` on `ListingCard` (and reusable on detail) with optimistic toggle test:** Task 2. ✓
- **Saved / favorites screen (screen 33):** Task 3. ✓
- **Messaging hooks (`useConversations`, `useMessages`, `useSendMessage` optimistic):** Task 4. ✓
- **Socket.IO client wiring (`src/lib/socket.ts`) authenticated with the access token + `useChatSocket`:** Task 5. ✓
- **Conversations list (screen 20):** Task 6. ✓
- **Chat thread — bubbles, input bar, typing indicator, read receipts (screen 21) + message-list render test:** Task 7. ✓
- **Realtime events consumed (`message:new`, `typing`, `message:read`) + emitted (`typing`, `message:read`, `conversation:join`):** Task 5 (`useChatSocket`) wired in Task 7 (ChatScreen). ✓
- **Navigation + listing-detail "Message lister" entry:** Task 8. ✓

**Type consistency:** the `Favorite`/`Message`/`Conversation` types in `src/api/*.ts` mirror the Phase 3 backend response shapes (the controller's emitted `message:new` row matches `Message`); `messagesKey(id)`/`favoritesKey`/`conversationsKey` are the single cache-key source shared by hooks, `useChatSocket`, and screens; `FavoriteButton` derives its state from the same `useFavorites` cache it mutates, so optimistic toggles and socket updates never diverge.

**No placeholders:** every code step is complete and runnable. Navigation wiring in Task 8 is described against the existing Phase 0–2 navigators (exact file names depend on the established shell) and adds concrete `Stack.Screen`/tab entries plus the listing-detail conversation starter — no stubbed logic.
