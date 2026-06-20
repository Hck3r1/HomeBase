import { generateOtp, hashOtp, verifyOtp } from '../src/lib/otp';

describe('otp', () => {
  it('generates a 6-digit code', () => {
    expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it('verifies a hashed otp', () => {
    const otp = '123456';
    const hash = hashOtp(otp);
    expect(verifyOtp('123456', hash)).toBe(true);
    expect(verifyOtp('000000', hash)).toBe(false);
  });
});
