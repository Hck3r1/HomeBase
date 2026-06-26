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

async function seedListing() {
  const token = await listerToken('owner@x.com');
  const created = await request(app).post('/api/v1/listings').set('Authorization', `Bearer ${token}`).send(rentBody);
  return created.body.id as string;
}

describe('favorites', () => {
  it('adds a favorite', async () => {
    const token = await seekerToken();
    const listingId = await seedListing();
    const res = await request(app).post(`/api/v1/favorites/${listingId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body.listingId).toBe(listingId);
  });

  it('is idempotent on repeated add', async () => {
    const token = await seekerToken();
    const listingId = await seedListing();
    await request(app).post(`/api/v1/favorites/${listingId}`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).post(`/api/v1/favorites/${listingId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(await prisma.favorite.count({ where: { listingId } })).toBe(1);
  });

  it('lists favorites with the listing embedded', async () => {
    const token = await seekerToken();
    const listingId = await seedListing();
    await request(app).post(`/api/v1/favorites/${listingId}`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).get('/api/v1/favorites').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].listing.id).toBe(listingId);
  });

  it('removes a favorite', async () => {
    const token = await seekerToken();
    const listingId = await seedListing();
    await request(app).post(`/api/v1/favorites/${listingId}`).set('Authorization', `Bearer ${token}`);
    const res = await request(app).delete(`/api/v1/favorites/${listingId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(await prisma.favorite.count()).toBe(0);
  });

  it('401 without a token', async () => {
    const listingId = await seedListing();
    expect((await request(app).post(`/api/v1/favorites/${listingId}`)).status).toBe(401);
  });
});
