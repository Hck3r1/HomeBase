import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { ConversationRow } from '../../components/ConversationRow';
import { EmptyState } from '../../components/EmptyState';
import { TabHeroHeader } from '../../components/TabHeroHeader';
import { conversationsKey, useConversations } from '../../api/messaging';
import { useConversationsRealtime } from '../../hooks/useConversationsRealtime';
import { useAuthStore } from '../../store/authStore';
import { navigateHomeStack } from '../../navigation/homeStackNavigation';
import { sortConversations, totalUnreadMessages } from '../../utils/conversationUnread';
import { theme } from '../../theme';

export function ConversationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useConversations();
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  useConversationsRealtime();

  useFocusEffect(
    React.useCallback(() => {
      void qc.invalidateQueries({ queryKey: conversationsKey });
    }, [qc]),
  );

  const conversations = useMemo(
    () => (data ? sortConversations(data, currentUserId) : []),
    [data, currentUserId],
  );

  const unreadMessageCount = useMemo(
    () => totalUnreadMessages(conversations, currentUserId),
    [conversations, currentUserId],
  );

  const openChat = (conversationId: string, title: string) => {
    navigateHomeStack(navigation, 'Chat', { conversationId, title });
  };

  const header = (
    <View style={styles.header}>
      <TabHeroHeader icon="chatbubbles" title="Messages" subtitle="Conversations with listers and seekers" />
      {conversations.length > 0 ? (
        <View style={styles.statsRow}>
          {unreadMessageCount > 0 ? (
            <View style={styles.unreadPill}>
              <View style={styles.unreadPillDot} />
              <Text style={styles.unreadPillText}>
                {unreadMessageCount} unread message{unreadMessageCount === 1 ? '' : 's'}
              </Text>
            </View>
          ) : (
            <View style={styles.countPill}>
              <Text style={styles.countText}>
                {conversations.length} conversation{conversations.length === 1 ? '' : 's'}
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.content}>{header}</View>
        <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <FlatList
        data={conversations}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + theme.spacing(10) },
          conversations.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations yet"
            text="Message a lister from a listing to start a conversation here."
          />
        }
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            currentUserId={currentUserId}
            onPress={() => openChat(item.id, item.listing.title)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  content: { paddingHorizontal: theme.spacing(3) },
  header: { paddingHorizontal: theme.spacing(3), paddingTop: theme.spacing(2) },
  statsRow: { flexDirection: 'row', marginBottom: theme.spacing(1) },
  countPill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.white,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  countText: {
    color: theme.colors.muted,
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
  },
  unreadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: '#D4E4DF',
  },
  unreadPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  unreadPillText: {
    color: theme.colors.primaryDark,
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightBold,
  },
  listContent: { paddingHorizontal: theme.spacing(3) },
  emptyList: { flexGrow: 1 },
  loader: { marginTop: theme.spacing(6) },
  separator: { height: theme.spacing(1.5) },
});
