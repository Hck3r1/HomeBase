import request from 'supertest';
import { io as ioClient, Socket } from 'socket.io-client';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { listerToken, seekerToken } from './helpers/listings';
import { startTestServer, stopTestServer } from './helpers/server';

let ctx: Awaited<ReturnType<typeof startTestServer>>;

beforeAll(async () => {
  ctx = await startTestServer();
});
beforeEach(resetDb);
afterAll(async () => {
  await stopTestServer(ctx.httpServer);
  await prisma.$disconnect();
});

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

function connect(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connect timeout')), 5000);
    const socket = ioClient(ctx.baseURL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: false,
    });
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function waitForAutoJoin() {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

describe('socket message:new', () => {
  it('rejects a handshake without a valid token', async () => {
    await expect(
      new Promise((_resolve, reject) => {
        const socket = ioClient(ctx.baseURL, { auth: { token: 'bad' }, transports: ['websocket'], forceNew: true });
        socket.on('connect', () => reject(new Error('should not connect')));
        socket.on('connect_error', (err) => reject(err));
      }),
    ).rejects.toBeTruthy();
  });

  it('delivers message:new to a joined participant', async () => {
    const owner = await makeLister('owner@x.com');
    const seeker = await makeSeeker('seeker@x.com');
    const listing = await request(ctx.httpServer)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${owner.token}`)
      .send(rentBody);
    const convo = await request(ctx.httpServer)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ listingId: listing.body.id });
    const conversationId = convo.body.id as string;

    const ownerSocket = await connect(owner.token);
    await waitForAutoJoin();

    const received = new Promise<{ body: string; conversationId: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('message:new timeout')), 8000);
      ownerSocket.once('message:new', (message) => {
        clearTimeout(timer);
        resolve(message);
      });
    });

    const postRes = await request(ctx.httpServer)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ body: 'Hello over socket' });
    expect(postRes.status).toBe(201);

    const message = await received;
    expect(message.body).toBe('Hello over socket');
    expect(message.conversationId).toBe(conversationId);

    ownerSocket.disconnect();
  });
});
