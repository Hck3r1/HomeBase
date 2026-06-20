import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { verifyUserEmail } from './helpers/auth';
import * as otp from '../src/lib/otp';

const app = createApp();

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('password reset with OTP', () => {
  it('returns 404 when email is not registered', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'nope@x.com' });
    expect(res.status).toBe(404);
  });

  it('sends OTP and completes full reset flow', async () => {
    jest.spyOn(otp, 'generateOtp').mockReturnValue('123456');

    await request(app).post('/api/v1/auth/register').send({ name: 'Al', email: 'r@x.com', password: 'password1' });
    await verifyUserEmail('r@x.com');

    const forgot = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'r@x.com' });
    expect(forgot.status).toBe(200);
    expect(forgot.body.ok).toBe(true);

    const verify = await request(app)
      .post('/api/v1/auth/verify-reset-otp')
      .send({ email: 'r@x.com', otp: '123456' });
    expect(verify.status).toBe(200);
    expect(verify.body.resetToken).toBeTruthy();

    const reset = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: verify.body.resetToken, password: 'newpass12' });
    expect(reset.status).toBe(200);

    const login = await request(app).post('/api/v1/auth/login').send({ email: 'r@x.com', password: 'newpass12' });
    expect(login.status).toBe(200);
  });

  it('rejects wrong OTP', async () => {
    jest.spyOn(otp, 'generateOtp').mockReturnValue('123456');
    await request(app).post('/api/v1/auth/register').send({ name: 'Al', email: 'w@x.com', password: 'password1' });
    await request(app).post('/api/v1/auth/forgot-password').send({ email: 'w@x.com' });
    const res = await request(app)
      .post('/api/v1/auth/verify-reset-otp')
      .send({ email: 'w@x.com', otp: '000000' });
    expect(res.status).toBe(400);
  });
});
