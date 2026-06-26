import { parseMessageNotificationData } from '../src/lib/push';

describe('parseMessageNotificationData', () => {
  it('parses message_new notification payloads', () => {
    expect(
      parseMessageNotificationData({
        type: 'message_new',
        conversationId: 'conv-1',
        listingTitle: 'Flat in Lekki',
      }),
    ).toEqual({
      type: 'message_new',
      conversationId: 'conv-1',
      listingTitle: 'Flat in Lekki',
    });
  });

  it('returns null for unrelated payloads', () => {
    expect(parseMessageNotificationData({ type: 'other' })).toBeNull();
    expect(parseMessageNotificationData(undefined)).toBeNull();
  });
});
