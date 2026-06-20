import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb } from './helpers/db';
import { verifyUserEmail } from './helpers/auth';

const app = createApp();
beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

async function registerUser() {
  await request(app).post('/api/v1/auth/register').send({ name: 'Al', email: 'me@x.com', password: 'password1' });
  await verifyUserEmail('me@x.com');
  const login = await request(app).post('/api/v1/auth/login').send({ email: 'me@x.com', password: 'password1' });
  return login.body.accessToken as string;
}

describe('/me', () => {
  it('returns the current user', async () => {
    const token = await registerUser();
    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('me@x.com');
  });

  it('upgrades to lister with a lister type', async () => {
    const token = await registerUser();
    const res = await request(app)
      .patch('/api/v1/me/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'lister', listerType: 'agent' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('lister');
    expect(res.body.listerType).toBe('agent');
  });

  it('registers a push token', async () => {
    const token = await registerUser();
    const res = await request(app)
      .post('/api/v1/me/push-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'ExpoTok[abc]', platform: 'ios' });
    expect(res.status).toBe(201);
  });

  it('updates profile fields and preferences during setup', async () => {
    const token = await registerUser();
    const profile = await request(app)
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Maya Okafor', phone: '+2348012345678', dateOfBirth: '2000-09-22', gender: 'female' });
    expect(profile.status).toBe(200);
    expect(profile.body.name).toBe('Maya Okafor');
    expect(profile.body.gender).toBe('female');
    expect(profile.body.setupStep).toBe('role');

    const role = await request(app)
      .patch('/api/v1/me/role')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'seeker' });
    expect(role.status).toBe(200);
    expect(role.body.setupStep).toBe('preferences');

    const prefs = await request(app)
      .patch('/api/v1/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        listingTypes: ['rent', 'shortstay'],
        budgetMin: 50000000,
        budgetMax: 250000000,
        preferredCity: 'Lagos',
        bedroomsMin: 2,
      });
    expect(prefs.status).toBe(200);
    expect(prefs.body.preferences.listingTypes).toEqual(['rent', 'shortstay']);
    expect(prefs.body.setupStep).toBe('preferences');

    const done = await request(app).post('/api/v1/me/setup-complete').set('Authorization', `Bearer ${token}`);
    expect(done.status).toBe(200);
    expect(done.body.setupCompletedAt).toBeTruthy();
  });
});
