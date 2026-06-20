import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { listerToken } from './helpers/listings';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

it('returns listings within radius ordered by distance', async () => {
  const token = await listerToken('n@x.com');
  const base = {
    listingType: 'rent',
    title: 'Flat Near',
    description: 'A flat to rent now',
    propertyType: 'apartment',
    bedrooms: 1,
    bathrooms: 1,
    amenities: [],
    address: '12 Test Street',
    city: 'Lagos',
    state: 'Lagos',
    rent: { annualRent: 1000000, securityDeposit: 0, leaseTermMonths: 12 },
  };
  await request(app)
    .post('/api/v1/listings')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...base, lat: 6.5, lng: 3.38 });
  await request(app)
    .post('/api/v1/listings')
    .set('Authorization', `Bearer ${token}`)
    .send({ ...base, title: 'Flat Far', lat: 9.05, lng: 7.49 });

  const res = await request(app).get('/api/v1/listings/nearby?lat=6.5&lng=3.38&radius=5000');
  expect(res.status).toBe(200);
  expect(res.body.data.length).toBe(1);
});
