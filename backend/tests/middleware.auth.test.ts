import express from 'express';
import request from 'supertest';
import { requireAuth, requireLister } from '../src/middleware/auth';
import { signAccessToken } from '../src/lib/jwt';
import { errorHandler } from '../src/middleware/error';

function app() {
  const a = express();
  a.get('/me', requireAuth, (req, res) => res.json({ id: req.user!.id }));
  a.get('/lister', requireAuth, requireLister, (_req, res) => res.json({ ok: true }));
  a.use(errorHandler);
  return a;
}

describe('auth middleware', () => {
  it('401 without token', async () => {
    expect((await request(app()).get('/me')).status).toBe(401);
  });
  it('200 with valid token', async () => {
    const t = signAccessToken({ sub: 'u1', role: 'seeker' });
    const res = await request(app()).get('/me').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('u1');
  });
  it('403 for non-lister on lister route', async () => {
    const t = signAccessToken({ sub: 'u1', role: 'seeker' });
    expect((await request(app()).get('/lister').set('Authorization', `Bearer ${t}`)).status).toBe(403);
  });
});
