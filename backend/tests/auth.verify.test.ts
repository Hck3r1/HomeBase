import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

const app = createApp();

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('verify email', () => {
  it('verifies via POST with token', async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Al', email: 'v@x.com', password: 'password1' });
    const user = await prisma.user.findUnique({ where: { email: 'v@x.com' } });
    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: user!.emailVerifyToken });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    const updated = await prisma.user.findUnique({ where: { email: 'v@x.com' } });
    expect(updated?.emailVerifiedAt).toBeTruthy();
  });

  it('verifies via GET link from email', async () => {
    await request(app).post('/api/v1/auth/register').send({ name: 'Al', email: 'link@x.com', password: 'password1' });
    const user = await prisma.user.findUnique({ where: { email: 'link@x.com' } });
    const res = await request(app).get(`/api/v1/auth/verify-email?token=${user!.emailVerifyToken}`);
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/You&apos;re all set/i);
    expect(res.text).toContain('HomeBase');
  });

  it('returns branded html for invalid GET token', async () => {
    const res = await request(app).get('/api/v1/auth/verify-email?token=not-a-real-token');
    expect(res.status).toBe(400);
    expect(res.text).toContain('This link didn&apos;t work');
  });

  it('rejects invalid token', async () => {
    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: 'not-a-real-token' });
    expect(res.status).toBe(400);
  });
});
