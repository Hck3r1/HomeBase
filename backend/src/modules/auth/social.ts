import { OAuth2Client } from 'google-auth-library';
import { parseEnv } from '../../config/env';
import { ApiError } from '../../middleware/error';

const env = parseEnv(process.env);

export interface SocialProfile {
  provider: 'google' | 'facebook' | 'x';
  providerUid: string;
  email: string;
  name: string;
}

export async function verifyProviderToken(provider: string, token: string): Promise<SocialProfile> {
  if (provider === 'google') {
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: token, audience: env.GOOGLE_CLIENT_ID });
    const p = ticket.getPayload();
    if (!p?.email) throw new ApiError(401, 'Invalid Google token');
    return { provider: 'google', providerUid: p.sub, email: p.email, name: p.name ?? p.email };
  }
  throw new ApiError(400, `Unsupported provider: ${provider}`);
}
