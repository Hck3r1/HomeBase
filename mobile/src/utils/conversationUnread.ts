import type { Conversation } from '../api/messaging';

export function conversationUnreadCount(conversation: Conversation, currentUserId: string): number {
  if (typeof conversation.unreadCount === 'number') return conversation.unreadCount;

  const last = conversation.messages[0];
  return last && last.senderId !== currentUserId && !last.readAt ? 1 : 0;
}

export function isConversationUnread(conversation: Conversation, currentUserId: string): boolean {
  return conversationUnreadCount(conversation, currentUserId) > 0;
}

export function totalUnreadMessages(conversations: Conversation[], currentUserId: string): number {
  return conversations.reduce((sum, c) => sum + conversationUnreadCount(c, currentUserId), 0);
}

export function sortConversations(conversations: Conversation[], currentUserId: string): Conversation[] {
  return [...conversations].sort((a, b) => {
    const aUnread = conversationUnreadCount(a, currentUserId);
    const bUnread = conversationUnreadCount(b, currentUserId);
    if (aUnread > 0 !== bUnread > 0) return aUnread > 0 ? -1 : 1;
    if (aUnread !== bUnread) return bUnread - aUnread;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function formatUnreadCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

export { formatUnreadCount };
