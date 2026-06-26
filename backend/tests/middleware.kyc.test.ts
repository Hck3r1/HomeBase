import express from 'express';
import request from 'supertest';
import { requireAuth } from '../src/middleware/auth';
import { requireKyc } from '../src/middleware/kyc';
import { errorHandler } from '../src/middleware/error';
import { signAccessToken } from '../src/lib/jwt';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';

function app() {
  const a = express();
  a.get('/gated', requireAuth, requireKyc, (_req, res) => res.json({ ok: true }));
  a.use(errorHandler);
  return a;
}

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function tokenFor(kyc: 'none' | 'pending' | 'verified') {
  const user = await prisma.user.create({
    data: { name: 'L', email: `k${Math.random()}@x.com`, role: 'lister', listerType: 'agent' },
  });
  if (kyc !== 'none') {
    await prisma.kycVerification.create({
      data: { userId: user.id, status: kyc, verifiedAt: kyc === 'verified' ? new Date() : null },
    });
  }
  return signAccessToken({ sub: user.id, role: 'lister' });
}

describe('requireKyc', () => {
  it('403 when no KYC record', async () => {
    const t = await tokenFor('none');
    expect((await request(app()).get('/gated').set('Authorization', `Bearer ${t}`)).status).toBe(403);
  });

  it('403 when KYC pending', async () => {
    const t = await tokenFor('pending');
    expect((await request(app()).get('/gated').set('Authorization', `Bearer ${t}`)).status).toBe(403);
  });

  it('200 when KYC verified', async () => {
    const t = await tokenFor('verified');
    expect((await request(app()).get('/gated').set('Authorization', `Bearer ${t}`)).status).toBe(200);
  });
});
