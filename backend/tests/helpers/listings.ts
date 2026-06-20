import request from 'supertest';
import { createApp } from '../../src/app';
import { hashPassword } from '../../src/lib/password';
import { prisma } from '../../src/lib/prisma';
import { signAccessToken } from '../../src/lib/jwt';

const app = createApp();

async function createVerifiedUser(
  email: string,
  name: string,
  role: 'seeker' | 'lister' = 'seeker',
  listerType?: 'agent' | 'landlord',
) {
  const passwordHash = await hashPassword('password1');
  return prisma.user.upsert({
    where: { email },
    create: {
      name,
      email,
      passwordHash,
      role,
      listerType: role === 'lister' ? listerType ?? 'agent' : null,
      emailVerifiedAt: new Date(),
      setupCompletedAt: new Date(),
    },
    update: {
      name,
      passwordHash,
      role,
      listerType: role === 'lister' ? listerType ?? 'agent' : null,
      emailVerifiedAt: new Date(),
    },
  });
}

export async function listerToken(email = 'l@x.com') {
  const user = await createVerifiedUser(email, 'L', 'lister', 'agent');
  return signAccessToken({ sub: user.id, role: 'lister' });
}

export async function seekerToken(email = 's@x.com') {
  const user = await createVerifiedUser(email, 'S', 'seeker');
  return signAccessToken({ sub: user.id, role: 'seeker' });
}

export async function loginViaApi(email: string, password = 'password1') {
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  return login.body.accessToken as string;
}

export { app as testApp };
