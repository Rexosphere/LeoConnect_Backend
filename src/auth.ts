import { createRemoteJWKSet, jwtVerify } from 'jose';

import { Env } from './index';

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

export async function verifyFirebaseToken(request: Request, env: Env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
    });
    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
