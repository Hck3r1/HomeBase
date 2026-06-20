import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { listerToken, seekerToken } from './helpers/listings';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const rentBody = {
  listingType: 'rent',
  title: '2-Bed Flat',
  description: 'Lovely flat in Yaba with parking',
  propertyType: 'apartment',
  bedrooms: 2,
  bathrooms: 2,
  amenities: ['parking'],
  address: '1 Herbert Macaulay',
  city: 'Lagos',
  state: 'Lagos',
  lat: 6.5,
  lng: 3.38,
  rent: { annualRent: 1800000, securityDeposit: 300000, leaseTermMonths: 12 },
};

describe('listing CRUD', () => {
  it('creates a rent listing', async () => {
    const token = await listerToken();
    const res = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send(rentBody);
    expect(res.status).toBe(201);
    expect(res.body.listingType).toBe('rent');
    expect(res.body.rent.annualRent).toBe(1800000);
  });

  it('rejects create from a seeker (403)', async () => {
    const token = await seekerToken();
    const res = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send(rentBody);
    expect(res.status).toBe(403);
  });

  it('gets a listing by id', async () => {
    const token = await listerToken('get@x.com');
    const created = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${token}`)
      .send(rentBody);
    const res = await request(app).get(`/api/v1/listings/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it('prevents non-owner from editing (403)', async () => {
    const ownerToken = await listerToken('owner@x.com');
    const created = await request(app)
      .post('/api/v1/listings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(rentBody);
    const otherToken = await listerToken('other@x.com');
    const res = await request(app)
      .patch(`/api/v1/listings/${created.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: 'Hacked' });
    expect(res.status).toBe(403);
  });
});
