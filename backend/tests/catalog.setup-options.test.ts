import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { seedRefOptions } from '../prisma/seed';

const app = createApp();

beforeAll(async () => {
  await seedRefOptions();
});

afterAll(() => prisma.$disconnect());

describe('GET /catalog/setup-options', () => {
  it('returns seeded cities, listing types, budgets, genders, and defaults', async () => {
    const res = await request(app).get('/api/v1/catalog/setup-options');
    expect(res.status).toBe(200);
    expect(res.body.cities.map((c: { label: string }) => c.label)).toContain('Lagos');
    expect(res.body.listingTypes.map((t: { code: string }) => t.code)).toEqual(
      expect.arrayContaining(['rent', 'sale', 'shortstay']),
    );
    expect(res.body.seekerBudgetPresets.length).toBeGreaterThan(0);
    expect(res.body.genders.map((g: { code: string }) => g.code)).toContain('female');
    expect(res.body.defaults.seeker.preferredCity).toBe('Lagos');
    expect(res.body.defaults.lister.serviceAreas).toEqual(['Lagos']);
  });
});
