import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { listerToken, seekerToken, testApp as app } from './helpers/listings';

beforeEach(resetDb);
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

async function makeListing(token: string) {
  const created = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${token}`).send(rentBody);
  return created.body.id as string;
}

describe('conversations', () => {
  it('creates a conversation about a listing with both participants', async () => {
    const owner = await makeLister('owner@x.com');
    const seeker = await makeSeeker('seeker@x.com');
    const listingId = await makeListing(owner.token);
    const res = await request(app).post('/api/v1/conversations').set('Authorization', `Bearer ${seeker.token}`).send({ listingId });
    expect(res.status).toBe(201);
    expect(res.body.listingId).toBe(listingId);
    expect(res.body.participants.map((p: { userId: string }) => p.userId).sort()).toEqual([owner.id, seeker.id].sort());
  });

  it('is idempotent per (participants, listing)', async () => {
    const owner = await makeLister('owner@x.com');
    const seeker = await makeSeeker('seeker@x.com');
    const listingId = await makeListing(owner.token);
    const first = await request(app).post('/api/v1/conversations').set('Authorization', `Bearer ${seeker.token}`).send({ listingId });
    const second = await request(app).post('/api/v1/conversations').set('Authorization', `Bearer ${seeker.token}`).send({ listingId });
    expect(second.body.id).toBe(first.body.id);
    expect(await prisma.conversation.count()).toBe(1);
  });

  it('rejects starting a conversation on your own listing', async () => {
    const owner = await makeLister('owner@x.com');
    const listingId = await makeListing(owner.token);
    const res = await request(app).post('/api/v1/conversations').set('Authorization', `Bearer ${owner.token}`).send({ listingId });
    expect(res.status).toBe(400);
  });

  it('lists conversations for the current user', async () => {
    const owner = await makeLister('owner@x.com');
    const seeker = await makeSeeker('seeker@x.com');
    const listingId = await makeListing(owner.token);
    await request(app).post('/api/v1/conversations').set('Authorization', `Bearer ${seeker.token}`).send({ listingId });
    const res = await request(app).get('/api/v1/conversations').set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].listingId).toBe(listingId);
    expect(res.body[0].listing.rating).toEqual({ average: null, count: 0 });
    expect(res.body[0].counterparty).toBeTruthy();
  });

  it('includes unread message count for the viewer', async () => {
    const owner = await makeLister('owner@x.com');
    const seeker = await makeSeeker('seeker@x.com');
    const listingId = await makeListing(owner.token);
    const created = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ listingId });
    const conversationId = created.body.id as string;

    await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ body: 'First message' });
    await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ body: 'Second message' });

    const list = await request(app).get('/api/v1/conversations').set('Authorization', `Bearer ${owner.token}`);
    expect(list.status).toBe(200);
    expect(list.body[0].unreadCount).toBe(2);

    const single = await request(app)
      .get(`/api/v1/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(single.body.unreadCount).toBe(2);
  });

  it('returns a single conversation with listing and counterparty details', async () => {
    const owner = await makeLister('owner@x.com');
    await prisma.kycVerification.create({
      data: { userId: owner.id, status: 'verified', verifiedAt: new Date() },
    });
    const seeker = await makeSeeker('seeker@x.com');
    const listingId = await makeListing(owner.token);
    const created = await request(app)
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ listingId });
    const res = await request(app)
      .get(`/api/v1/conversations/${created.body.id}`)
      .set('Authorization', `Bearer ${seeker.token}`);
    expect(res.status).toBe(200);
    expect(res.body.listing.title).toBe('Flat');
    expect(res.body.listing.owner.kycVerified).toBe(true);
    expect(res.body.counterparty.kycVerified).toBe(true);
    expect(res.body.counterparty.id).toBe(owner.id);
  });
});
