import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validate } from '../src/middleware/validate';
import { errorHandler } from '../src/middleware/error';

function app() {
  const a = express();
  a.use(express.json());
  a.post('/x', validate(z.object({ body: z.object({ email: z.string().email() }) })), (_req, res) =>
    res.json({ ok: true }),
  );
  a.use(errorHandler);
  return a;
}

describe('validate', () => {
  it('passes valid body', async () => {
    const res = await request(app()).post('/x').send({ email: 'a@b.com' });
    expect(res.status).toBe(200);
  });
  it('rejects invalid body with 400', async () => {
    const res = await request(app()).post('/x').send({ email: 'nope' });
    expect(res.status).toBe(400);
  });
});
