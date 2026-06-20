import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { listerToken } from './helpers/listings';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

it('attaches a photo record to a listing', async () => {
  const token = await listerToken('p@x.com');
  const created = await request(app)
    .post('/api/v1/listings')
    .set('Authorization', `Bearer ${token}`)
    .send({
      listingType: 'sale',
      title: 'House',
      description: 'A nice house for sale',
      propertyType: 'house',
      bedrooms: 3,
      bathrooms: 2,
      amenities: [],
      address: '12 Test Street',
      city: 'Lagos',
      state: 'Lagos',
      lat: 6.5,
      lng: 3.38,
      sale: { salePrice: 50000000, negotiable: true },
    });
  expect(created.status).toBe(201);
  const res = await request(app)
    .post(`/api/v1/listings/${created.body.id}/photos`)
    .set('Authorization', `Bearer ${token}`)
    .send({ cloudinaryPublicId: 'abc', url: 'https://res.cloudinary.com/x/abc.jpg', position: 0 });
  expect(res.status).toBe(201);
  expect(res.body.url).toContain('cloudinary');
});
