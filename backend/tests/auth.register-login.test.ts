import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { verifyUserEmail } from './helpers/auth';

const app = createApp();

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('register + login', () => {
  it('registers and sends verification (no tokens)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Moyo', email: 'moyo@x.com', password: 'password1' });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.accessToken).toBeUndefined();
    const user = await prisma.user.findUnique({ where: { email: 'moyo@x.com' } });
    expect(user?.emailVerifyToken).toBeTruthy();
    expect(user?.emailVerifiedAt).toBeNull();
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Al', email: 'd@x.com', password: 'password1' });
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'Bo', email: 'd@x.com', password: 'password1' });
    expect(res.status).toBe(409);
  });

  it('blocks login until email is verified', async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Al', email: 'l@x.com', password: 'password1' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'l@x.com', password: 'password1' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/verify your email/i);
  });

  it('logs in after verification', async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Al', email: 'l@x.com', password: 'password1' });
    await verifyUserEmail('l@x.com');
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'l@x.com', password: 'password1' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Al', email: 'w@x.com', password: 'password1' });
    await verifyUserEmail('w@x.com');
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'w@x.com', password: 'nope' });
    expect(res.status).toBe(401);
  });
});
