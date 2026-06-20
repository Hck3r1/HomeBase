import { hashPassword, verifyPassword } from '../src/lib/password';

describe('password', () => {
  it('hashes and verifies', async () => {
    const hash = await hashPassword('secret123');
    expect(hash).not.toBe('secret123');
    expect(await verifyPassword('secret123', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});
