import { conversationUnreadCount, isConversationUnread, sortConversations } from '../src/utils/conversationUnread';
import type { Conversation } from '../src/api/messaging';

const base = (overrides: Partial<Conversation> = {}): Conversation =>
  ({
    id: 'c1',
    listingId: 'l1',
    updatedAt: '2026-06-20T12:00:00Z',
    participants: [],
    listing: {
      id: 'l1',
      title: 'Flat',
      listingType: 'rent',
      status: 'active',
      description: '',
      propertyType: 'apartment',
      bedrooms: 2,
      bathrooms: 1,
      address: '',
      city: 'Lagos',
      state: 'Lagos',
      photos: [],
      rentDetails: null,
      saleDetails: null,
      shortstayDetails: null,
      owner: {} as Conversation['listing']['owner'],
      rating: { average: null, count: 0 },
    },
    counterparty: null,
    messages: [],
    ...overrides,
  }) as Conversation;

describe('conversationUnread', () => {
  it('marks unread when last message is from the other party and not read', () => {
    const conv = base({
      messages: [
        {
          id: 'm1',
          conversationId: 'c1',
          senderId: 'them',
          body: 'Hello',
          readAt: null,
          createdAt: '2026-06-20T12:00:00Z',
        },
      ],
    });
    expect(isConversationUnread(conv, 'me')).toBe(true);
  });

  it('marks read when the last message was sent by me', () => {
    const conv = base({
      messages: [
        {
          id: 'm1',
          conversationId: 'c1',
          senderId: 'me',
          body: 'Hi',
          readAt: null,
          createdAt: '2026-06-20T12:00:00Z',
        },
      ],
    });
    expect(isConversationUnread(conv, 'me')).toBe(false);
  });

  it('returns unread count from the API field when present', () => {
    const conv = base({ unreadCount: 5 });
    expect(conversationUnreadCount(conv, 'me')).toBe(5);
    expect(isConversationUnread(conv, 'me')).toBe(true);
  });

  it('sorts unread conversations first', () => {
    const read = base({
      id: 'read',
      unreadCount: 0,
      updatedAt: '2026-06-20T13:00:00Z',
      messages: [
        {
          id: 'm1',
          conversationId: 'read',
          senderId: 'me',
          body: 'ok',
          readAt: null,
          createdAt: '2026-06-20T13:00:00Z',
        },
      ],
    });
    const unread = base({
      id: 'unread',
      unreadCount: 3,
      updatedAt: '2026-06-20T10:00:00Z',
      messages: [
        {
          id: 'm2',
          conversationId: 'unread',
          senderId: 'them',
          body: 'ping',
          readAt: null,
          createdAt: '2026-06-20T10:00:00Z',
        },
      ],
    });

    expect(sortConversations([read, unread], 'me').map((c) => c.id)).toEqual(['unread', 'read']);
  });
});
