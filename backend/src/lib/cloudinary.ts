import { v2 as cloudinary } from 'cloudinary';
import { parseEnv } from '../config/env';

export function cloudinaryConfigured(): boolean {
  const e = parseEnv(process.env);
  return Boolean(e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET);
}

export function signUploadParams(folder: string) {
  const e = parseEnv(process.env);
  if (!e.CLOUDINARY_CLOUD_NAME || !e.CLOUDINARY_API_KEY || !e.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured');
  }

  cloudinary.config({
    cloud_name: e.CLOUDINARY_CLOUD_NAME,
    api_key: e.CLOUDINARY_API_KEY,
    api_secret: e.CLOUDINARY_API_SECRET,
  });

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, e.CLOUDINARY_API_SECRET);
  return {
    timestamp,
    folder,
    signature,
    apiKey: e.CLOUDINARY_API_KEY,
    cloudName: e.CLOUDINARY_CLOUD_NAME,
  };
}

export { cloudinary };
