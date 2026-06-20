import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../src/lib/jwt';

describe('jwt', () => {
  it('round-trips an access token', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'seeker' });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('seeker');
  });

  it('rejects an access token verified as refresh', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'seeker' });
    expect(() => verifyRefreshToken(token)).toThrow();
  });
});
