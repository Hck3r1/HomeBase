process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '4000';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://homebase:homebase@localhost:5432/homebase_test';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
