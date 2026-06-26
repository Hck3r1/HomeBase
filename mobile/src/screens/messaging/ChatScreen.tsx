import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MessageList } from '../../components/MessageList';
import { ChatHeader } from '../../components/messaging/ChatHeader';
import { ChatListingCard } from '../../components/messaging/ChatListingCard';
import { ListerProfileSheet } from '../../components/messaging/ListerProfileSheet';
import { RatingSheet } from '../../components/messaging/RatingSheet';
import { useConversation, useMessages, useSendMessage } from '../../api/messaging';
import { useChatSocket } from '../../hooks/useChatSocket';
import { useAuthStore } from '../../store/authStore';
import { getSocket } from '../../lib/socket';
import { navigateHomeStack } from '../../navigation/homeStackNavigation';
import { theme } from '../../theme';

export function ChatScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { conversationId } = route.params as { conversationId: string; title?: string };
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');
  const userRole = useAuthStore((s) => s.user?.role ?? 'seeker');
  const { data: conversation, isLoading: loadingConvo } = useConversation(conversationId);
  const { data: messages, isLoading: loadingMessages } = useMessages(conversationId);
  const send = useSendMessage(conversationId);
  const { typingUserIds, sendTyping, markRead } = useChatSocket(conversationId);
  const [text, setText] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);

  useEffect(() => {
    if ((messages?.length ?? 0) > 0) markRead();
  }, [messages?.length, markRead]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId) return;
    socket.emit('chat:focus', conversationId);
    return () => {
      socket.emit('chat:blur');
    };
  }, [conversationId]);

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

  const loading = loadingConvo || loadingMessages;
  const counterparty = conversation?.counterparty ?? null;

  return (
    <View style={styles.root}>
      <ChatHeader
        counterparty={counterparty}
        onBack={() => navigation.goBack()}
        onProfilePress={() => setProfileOpen(true)}
        onRatePress={() => setRatingOpen(true)}
        showRate={userRole === 'seeker'}
      />

      {conversation ? (
        <ChatListingCard
          listing={conversation.listing}
          onPress={() => navigateHomeStack(navigation, 'ListingDetail', { id: conversation.listing.id })}
        />
      ) : null}

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
      ) : (
        <View style={styles.messages}>
          <MessageList messages={messages ?? []} currentUserId={currentUserId} />
        </View>
      )}

      {typingUserIds.filter((id) => id !== currentUserId).length > 0 ? (
        <View style={styles.typingWrap}>
          <View style={styles.typingDots}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotMid]} />
            <View style={styles.dot} />
          </View>
          <Text style={styles.typing}>{counterparty?.name?.split(' ')[0] ?? 'They'} is typing…</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, theme.spacing(1)) }]}>
          <TextInput
            style={styles.input}
            placeholder="Write a message…"
            placeholderTextColor={theme.colors.muted}
            value={text}
            onChangeText={onChange}
            multiline
          />
          <Pressable
            style={[styles.send, !text.trim() && styles.sendDisabled]}
            onPress={submit}
            disabled={!text.trim() || send.isPending}
            accessibilityRole="button"
            accessibilityLabel="Send"
          >
            <Ionicons name="send" size={18} color={theme.colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ListerProfileSheet visible={profileOpen} profile={counterparty} onClose={() => setProfileOpen(false)} />
      <RatingSheet visible={ratingOpen} conversation={conversation} onClose={() => setRatingOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.surface },
  messages: { flex: 1 },
  loader: { marginTop: theme.spacing(6) },
  typingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing(2.5),
    paddingBottom: 6,
    gap: 8,
  },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.colors.muted, opacity: 0.5 },
  dotMid: { opacity: 0.85 },
  typing: { color: theme.colors.muted, fontSize: theme.font.sizeSm, fontStyle: 'italic' },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing(2),
    paddingTop: theme.spacing(1.25),
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    backgroundColor: theme.colors.white,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: theme.colors.input,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingHorizontal: theme.spacing(1.75),
    paddingVertical: theme.spacing(1.25),
    color: theme.colors.ink,
    fontSize: theme.font.sizeMd,
  },
  send: {
    marginLeft: theme.spacing(1),
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
});
