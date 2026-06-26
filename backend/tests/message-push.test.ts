import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { listerToken, seekerToken, testApp as app } from './helpers/listings';

jest.mock('expo-server-sdk', () => {
  const sendPush = jest.fn().mockResolvedValue([{ status: 'ok', id: 'ticket-1' }]);
  const chunk = jest.fn((messages: unknown[]) => [messages]);

  return {
    Expo: class MockExpo {
      static isExpoPushToken(token: string) {
        return token.startsWith('ExponentPushToken[');
      }

      chunkPushNotifications = chunk;

      sendPushNotificationsAsync = sendPush;
    },
    __mockSendPush: sendPush,
    __mockChunk: chunk,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pushMocks = require('expo-server-sdk') as {
  __mockSendPush: jest.Mock;
  __mockChunk: jest.Mock;
};

beforeEach(async () => {
  await resetDb();
  pushMocks.__mockSendPush.mockClear();
  pushMocks.__mockChunk.mockClear();
});
afterAll(() => prisma.$disconnect());

const rentBody = {
  listingType: 'rent',
  title: 'Flat',
  description: 'A nice flat to rent',
  propertyType: 'apartment',
  bedrooms: 2,
  bathrooms: 1,
  amenities: [],
  address: '12 Main Street',
  city: 'Lagos',
  state: 'Lagos',
  lat: 6.5,
  lng: 3.38,
  rent: { annualRent: 1000000, securityDeposit: 0, leaseTermMonths: 12 },
};

async function makeLister(email: string) {
  const token = await listerToken(email);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { id: user.id, token };
}

async function makeSeeker(email: string) {
  const token = await seekerToken(email);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { id: user.id, token };
}

describe('message push notifications', () => {
  it('sends a push to the recipient when a new message is posted', async () => {
    const owner = await makeLister('owner@x.com');
    const seeker = await makeSeeker('seeker@x.com');
    const listing = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${owner.token}`)
      .send(rentBody);
    const conversation = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ listingId: listing.body.id });

    await prisma.pushToken.create({
      data: {
        userId: owner.id,
        token: 'ExponentPushToken[test-owner]',
        platform: 'ios',
      },
    });

    const res = await request(app)
      .post(`/api/v1/conversations/${conversation.body.id}/messages`)
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ body: 'Is this still available?' });

    expect(res.status).toBe(201);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(pushMocks.__mockSendPush).toHaveBeenCalled();
    const payload = pushMocks.__mockSendPush.mock.calls[0][0][0];
    expect(payload.to).toBe('ExponentPushToken[test-owner]');
    expect(payload.title).toBeTruthy();
    expect(payload.body).toContain('Is this still available?');
    expect(payload.data).toMatchObject({
      type: 'message_new',
      conversationId: conversation.body.id,
      listingTitle: 'Flat',
    });
  });
});
