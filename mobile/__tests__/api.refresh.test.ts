import { shouldAttemptTokenRefresh } from '../src/lib/api';

describe('shouldAttemptTokenRefresh', () => {
  it('retries protected routes on 401', () => {
    expect(shouldAttemptTokenRefresh('/me', 401)).toBe(true);
    expect(shouldAttemptTokenRefresh('/me/preferences', 401)).toBe(true);
  });

  it('skips auth endpoints', () => {
    expect(shouldAttemptTokenRefresh('/auth/login', 401)).toBe(false);
    expect(shouldAttemptTokenRefresh('/auth/refresh', 401)).toBe(false);
    expect(shouldAttemptTokenRefresh('/auth/register', 401)).toBe(false);
  });

  it('ignores non-401 responses', () => {
    expect(shouldAttemptTokenRefresh('/me', 403)).toBe(false);
    expect(shouldAttemptTokenRefresh('/me', 500)).toBe(false);
  });
});
