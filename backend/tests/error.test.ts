import express from 'express';
import request from 'supertest';
import { notFound, errorHandler, ApiError } from '../src/middleware/error';

function buildApp() {
  const app = express();
  app.get('/boom', () => {
    throw new ApiError(418, 'teapot');
  });
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe('error middleware', () => {
  it('returns structured error for ApiError', async () => {
    const res = await request(buildApp()).get('/boom');
    expect(res.status).toBe(418);
    expect(res.body).toEqual({ error: { message: 'teapot', status: 418 } });
  });

  it('returns 404 for unknown route', async () => {
    const res = await request(buildApp()).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.status).toBe(404);
  });
});
