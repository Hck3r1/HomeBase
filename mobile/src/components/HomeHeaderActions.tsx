import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  if (count > 9) return '9+';
  return String(count);
}

function HeaderIconBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = formatBadgeCount(count);
  const compact = label.length === 1;

  return (
    <View style={[styles.badge, compact ? styles.badgeDot : styles.badgePill]}>
      <Text style={[styles.badgeText, compact && styles.badgeTextDot]}>{label}</Text>
    </View>
  );
}

interface Props {
  unreadMessages?: number;
  unreadNotifications?: number;
  onMessagesPress: () => void;
  onNotificationsPress: () => void;
}

export function HomeHeaderActions({
  unreadMessages = 0,
  unreadNotifications = 0,
  onMessagesPress,
  onNotificationsPress,
}: Props) {
  const messagesLabel =
    unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : 'Messages';
  const notificationsLabel =
    unreadNotifications > 0 ? `Notifications, ${unreadNotifications} unread` : 'Notifications';

  return (
    <View style={styles.cluster}>
      <Pressable
        style={styles.btn}
        onPress={onMessagesPress}
        accessibilityRole="button"
        accessibilityLabel={messagesLabel}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={theme.colors.ink} />
        <HeaderIconBadge count={unreadMessages} />
      </Pressable>
      <View style={styles.divider} />
      <Pressable
        style={styles.btn}
        onPress={onNotificationsPress}
        accessibilityRole="button"
        accessibilityLabel={notificationsLabel}
      >
        <Ionicons name="notifications-outline" size={20} color={theme.colors.ink} />
        <HeaderIconBadge count={unreadNotifications} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cluster: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: theme.colors.line,
    paddingHorizontal: 4,
    ...theme.shadow.sm,
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: theme.colors.line,
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 1,
    backgroundColor: theme.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  badgeDot: {
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 0,
  },
  badgePill: {
    minWidth: 20,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 9,
    fontWeight: theme.font.weightBold,
    lineHeight: 11,
  },
  badgeTextDot: {
    fontSize: 10,
    lineHeight: 12,
  },
});
