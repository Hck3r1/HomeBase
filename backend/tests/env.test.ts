import { parseEnv } from '../src/config/env';

describe('parseEnv', () => {
  it('parses valid env', () => {
    const env = parseEnv({
      NODE_ENV: 'test',
      PORT: '4000',
      DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
      JWT_ACCESS_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32),
    });
    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('test');
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() =>
      parseEnv({ NODE_ENV: 'test', PORT: '4000', JWT_ACCESS_SECRET: 'x'.repeat(32), JWT_REFRESH_SECRET: 'y'.repeat(32) }),
    ).toThrow();
  });
});
