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

async function setup() {
  const owner = await makeLister('owner@x.com');
  const seeker = await makeSeeker('seeker@x.com');
  const created = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${owner.token}`).send(rentBody);
  const convo = await request(app)
    .post('/api/v1/conversations')
    .set('Authorization', `Bearer ${seeker.token}`)
    .send({ listingId: created.body.id });
  return { owner, seeker, conversationId: convo.body.id as string };
}

describe('messages', () => {
  it('posts and lists messages in order', async () => {
    const { owner, seeker, conversationId } = await setup();
    await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ body: 'Hi, is it available?' });
    await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ body: 'Yes it is.' });
    const res = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${seeker.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].body).toBe('Hi, is it available?');
    expect(res.body[1].body).toBe('Yes it is.');
  });

  it('rejects a non-participant (403)', async () => {
    const { conversationId } = await setup();
    const intruder = await makeSeeker('intruder@x.com');
    const res = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${intruder.token}`)
      .send({ body: 'sneaky' });
    expect(res.status).toBe(403);
  });

  it('rejects an empty message body (400)', async () => {
    const { seeker, conversationId } = await setup();
    const res = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ body: '' });
    expect(res.status).toBe(400);
  });
});
