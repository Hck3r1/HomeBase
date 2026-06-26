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

async function makeLister(email: string, verified = false) {
  const token = await listerToken(email);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  if (verified) {
    await prisma.kycVerification.create({
      data: { userId: user.id, status: 'verified', verifiedAt: new Date() },
    });
  }
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

describe('reviews', () => {
  it('creates listing and lister reviews', async () => {
    const owner = await makeLister('owner@x.com', true);
    const seeker = await makeSeeker('seeker@x.com');
    const listingId = await makeListing(owner.token);

    const listingReview = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ targetType: 'listing', targetId: listingId, rating: 4, comment: 'Great place' });
    expect(listingReview.status).toBe(201);

    const listerReview = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ targetType: 'lister', targetId: owner.id, rating: 5 });
    expect(listerReview.status).toBe(201);

    const listingSummary = await request(app)
      .get('/api/v1/reviews/summary')
      .query({ targetType: 'listing', targetId: listingId });
    expect(listingSummary.body).toEqual({ average: 4, count: 1 });

    const listerSummary = await request(app)
      .get('/api/v1/reviews/summary')
      .query({ targetType: 'lister', targetId: owner.id });
    expect(listerSummary.body).toEqual({ average: 5, count: 1 });
  });

  it('rejects duplicate reviews', async () => {
    const owner = await makeLister('owner@x.com');
    const seeker = await makeSeeker('seeker@x.com');
    const listingId = await makeListing(owner.token);
    await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ targetType: 'listing', targetId: listingId, rating: 3 });
    const dup = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${seeker.token}`)
      .send({ targetType: 'listing', targetId: listingId, rating: 5 });
    expect(dup.status).toBe(409);
  });
});
