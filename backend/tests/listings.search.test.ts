import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { listerToken } from './helpers/listings';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function seedListing(overrides: { price?: number; listing?: Record<string, unknown> } = {}) {
  const email = `l${Math.random()}@x.com`;
  const token = await listerToken(email);
  return request(app)
    .post('/api/v1/listings')
    .set('Authorization', `Bearer ${token}`)
    .send({
      listingType: 'rent',
      title: 'Flat',
      description: 'A nice flat to rent',
      propertyType: 'apartment',
      bedrooms: 2,
      bathrooms: 1,
      amenities: [],
      address: '12 Test Street',
      city: 'Lagos',
      state: 'Lagos',
      lat: 6.5,
      lng: 3.38,
      rent: {
        annualRent: overrides.price ?? 1000000,
        securityDeposit: 0,
        leaseTermMonths: 12,
      },
      ...overrides.listing,
    });
}

describe('search', () => {
  it('filters by type and bedrooms', async () => {
    await seedListing({ listing: { bedrooms: 2 } });
    await seedListing({ listing: { bedrooms: 4 } });
    const res = await request(app).get('/api/v1/listings?type=rent&bedrooms=4');
    expect(res.status).toBe(200);
    expect(res.body.data.every((l: { bedrooms: number }) => l.bedrooms >= 4)).toBe(true);
  });

  it('filters by min and max price for rent', async () => {
    await seedListing({ price: 500000 });
    await seedListing({ price: 1500000 });
    await seedListing({ price: 3000000 });
    const res = await request(app).get('/api/v1/listings?type=rent&minPrice=1000000&maxPrice=2000000');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].rent.annualRent).toBe(1500000);
  });

  it('sorts rent listings by price ascending', async () => {
    await seedListing({ price: 3000000 });
    await seedListing({ price: 500000 });
    const res = await request(app).get('/api/v1/listings?type=rent&sort=priceAsc');
    expect(res.status).toBe(200);
    const prices = res.body.data.map((l: { rent: { annualRent: number } }) => l.rent.annualRent);
    expect(prices).toEqual([...prices].sort((a: number, b: number) => a - b));
  });
});
