import React from 'react';
import { Image, Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Conversation } from '../api/messaging';
import { KycBadge } from './KycBadge';
import { RatingBadge } from './StarRating';
import { isConversationUnread, conversationUnreadCount, formatUnreadCount } from '../utils/conversationUnread';
import { theme } from '../theme';

interface Props {
  conversation: Conversation;
  currentUserId: string;
  onPress: () => void;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function previewText(conversation: Conversation, currentUserId: string): string {
  const last = conversation.messages[0];
  if (!last?.body) return 'Start the conversation';
  if (last.senderId === currentUserId) return `You: ${last.body}`;
  return last.body;
}

export function ConversationRow({ conversation, currentUserId, onPress }: Props) {
  const other =
    conversation.counterparty ??
    conversation.participants.find((p) => p.userId !== currentUserId)?.user;
  const unread = isConversationUnread(conversation, currentUserId);
  const unreadCount = conversationUnreadCount(conversation, currentUserId);
  const listingPhoto = conversation.listing.photos[0]?.url;
  const userPhoto = other?.avatarUrl;
  const preview = previewText(conversation, currentUserId);
  const timestamp = conversation.messages[0]?.createdAt ?? conversation.updatedAt;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        unread ? styles.rowUnread : styles.rowRead,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${other?.name ?? 'Conversation'}${unread ? `, ${unreadCount} unread messages` : ''}`}
    >
      {unread ? <View style={styles.unreadBar} /> : null}

      <View style={styles.avatarWrap}>
        {listingPhoto ? (
          <Image source={{ uri: listingPhoto }} style={styles.listingThumb} />
        ) : (
          <View style={styles.listingFallback}>
            <Ionicons name="home-outline" size={22} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.userAvatar}>
          {userPhoto ? (
            <Image source={{ uri: userPhoto }} style={styles.userAvatarImage} />
          ) : (
            <Text style={styles.userAvatarText}>{(other?.name ?? '?').charAt(0).toUpperCase()}</Text>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={[styles.name, unread && styles.nameUnread]} numberOfLines={1}>
            {other?.name ?? 'Conversation'}
          </Text>
          <View style={styles.metaRight}>
            <Text style={[styles.time, unread && styles.timeUnread]}>{timeAgo(timestamp)}</Text>
          </View>
        </View>

        <View style={styles.listingRow}>
          <Ionicons name="business-outline" size={12} color={theme.colors.primary} />
          <Text style={styles.listingTitle} numberOfLines={1}>
            {conversation.listing.title}
          </Text>
        </View>

        <View style={styles.previewRow}>
          <Text
            style={[styles.preview, unread ? styles.previewUnread : styles.previewRead]}
            numberOfLines={2}
          >
            {preview}
          </Text>
          {unreadCount > 0 ? (
            <View style={[styles.unreadBadge, unreadCount > 9 && styles.unreadBadgeWide]}>
              <Text style={styles.unreadBadgeText}>{formatUnreadCount(unreadCount)}</Text>
            </View>
          ) : null}
        </View>

        {(other?.kycVerified || (other?.rating.count ?? 0) > 0) && (
          <View style={styles.footer}>
            {other ? <KycBadge verified={other.kycVerified} compact /> : null}
            <RatingBadge average={other?.rating.average ?? null} count={other?.rating.count ?? 0} compact />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(2),
    borderRadius: theme.radii.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  rowRead: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  rowUnread: {
    backgroundColor: theme.colors.primaryLight,
    borderWidth: 1,
    borderColor: '#D4E4DF',
  },
  rowPressed: { opacity: 0.92 },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: theme.colors.primary,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: theme.spacing(1.75),
    marginLeft: 2,
  },
  listingThumb: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
  },
  listingFallback: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: theme.colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatar: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
    overflow: 'hidden',
  },
  userAvatarImage: { width: '100%', height: '100%' },
  userAvatarText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: theme.font.weightBold,
  },
  body: { flex: 1, minWidth: 0 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.ink,
  },
  nameUnread: { fontWeight: theme.font.weightBold },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { fontSize: theme.font.sizeXs, color: theme.colors.muted },
  timeUnread: { color: theme.colors.primary, fontWeight: theme.font.weightSemibold },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  preview: {
    flex: 1,
    fontSize: theme.font.sizeSm,
    lineHeight: 18,
  },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  listingTitle: {
    flex: 1,
    fontSize: theme.font.sizeXs,
    color: theme.colors.primary,
    fontWeight: theme.font.weightSemibold,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginBottom: 1,
  },
  unreadBadgeWide: {
    minWidth: 28,
    paddingHorizontal: 7,
  },
  unreadBadgeText: {
    color: theme.colors.white,
    fontSize: 11,
    fontWeight: theme.font.weightBold,
    lineHeight: 13,
  },
  previewUnread: {
    color: theme.colors.ink,
    fontWeight: theme.font.weightSemibold,
  },
  previewRead: {
    color: theme.colors.muted,
    fontWeight: theme.font.weightRegular,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
});
