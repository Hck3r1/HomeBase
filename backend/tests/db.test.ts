import { prisma } from '../src/lib/prisma';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('database connectivity', () => {
  it('can run a trivial query', async () => {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    expect(rows[0].ok).toBe(1);
  });

  it('has postgis available', async () => {
    const rows = await prisma.$queryRaw<{ postgis_version: string }[]>`SELECT postgis_version()`;
    expect(typeof rows[0].postgis_version).toBe('string');
  });
});
