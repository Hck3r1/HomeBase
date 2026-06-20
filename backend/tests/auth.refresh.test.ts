import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { verifyUserEmail } from './helpers/auth';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('refresh', () => {
  it('returns new tokens from a valid refresh token', async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Al', email: 'ref@x.com', password: 'password1' });
    await verifyUserEmail('ref@x.com');
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'ref@x.com', password: 'password1' });
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });
});
