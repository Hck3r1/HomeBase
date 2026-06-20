jest.mock('../src/modules/auth/social', () => ({
  verifyProviderToken: jest.fn().mockResolvedValue({
    provider: 'google',
    providerUid: 'g-123',
    email: 'social@x.com',
    name: 'Social User',
  }),
}));

import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('social login', () => {
  it('creates a user on first social login and returns tokens', async () => {
    const res = await request(app).post('/api/v1/auth/social').send({ provider: 'google', token: 'fake-token-12345' });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('social@x.com');
    expect(res.body.accessToken).toBeTruthy();
  });
});
