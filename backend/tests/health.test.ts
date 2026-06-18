import request from 'supertest';
import { createApp } from '../src/app';

describe('GET /health', () => {
  it('returns ok with uptime', async () => {
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });
});
