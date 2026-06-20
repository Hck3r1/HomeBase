import { signUploadParams } from '../src/lib/cloudinary';

describe('cloudinary signed params', () => {
  it('returns a signature, timestamp, and api key', () => {
    const params = signUploadParams('listings');
    expect(params.signature).toBeTruthy();
    expect(params.timestamp).toBeGreaterThan(0);
    expect(params.folder).toBe('listings');
  });
});
