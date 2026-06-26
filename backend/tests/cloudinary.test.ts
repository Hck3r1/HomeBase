import { cloudinaryConfigured, signUploadParams } from '../src/lib/cloudinary';

describe('cloudinary signed params', () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.CLOUDINARY_API_KEY = '123456';
    process.env.CLOUDINARY_API_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it('returns a signature, timestamp, and api key', () => {
    const params = signUploadParams('listings');
    expect(params.signature).toBeTruthy();
    expect(params.timestamp).toBeGreaterThan(0);
    expect(params.folder).toBe('listings');
    expect(params.cloudName).toBe('test-cloud');
    expect(params.apiKey).toBe('123456');
  });

  it('reports when cloudinary env is missing', () => {
    delete process.env.CLOUDINARY_API_SECRET;
    expect(cloudinaryConfigured()).toBe(false);
    expect(() => signUploadParams('listings')).toThrow('Cloudinary is not configured');
  });
});
