import { createRemoteJWKSet, jwtVerify } from 'jose';

import { Env } from './index';

// Firebase token verification
const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const FIREBASE_JWKS = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

// Google OAuth ID token verification
const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

// Known Google OAuth client IDs (add your Desktop client ID here)
const GOOGLE_CLIENT_IDS = [
  '124058547668-kon20mi71tottki8najp3cv58qj3ptf3.apps.googleusercontent.com', // Web client
  '124058547668-op2vcm8185rc9s30d5sdjn2b00r1hp9p.apps.googleusercontent.com', // Desktop client
];

/**
 * Extract the actual Google user ID from a token payload
 * For Firebase tokens, extracts from firebase.identities.google.com
 * For Google OAuth tokens, uses sub directly
 */
export function extractGoogleUserId(payload: any): string {
  // Check if this is a Firebase token with Google sign-in
  if (payload.firebase && typeof payload.firebase === 'object') {
    const firebase = payload.firebase as any;
    if (firebase.identities && firebase.identities['google.com'] && Array.isArray(firebase.identities['google.com'])) {
      // Use the Google user ID from identities
      return firebase.identities['google.com'][0] as string;
    }
  }

  // For direct Google OAuth tokens or fallback, use sub
  return payload.sub as string;
}

export async function verifyFirebaseToken(request: Request, env: Env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];

  // Try Firebase token first
  try {
    const { payload } = await jwtVerify(token, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      audience: env.FIREBASE_PROJECT_ID,
    });
    return payload;
  } catch (firebaseError) {
    // Firebase verification failed, try Google OAuth token
  }

  // Try Google OAuth ID token
  try {
    const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
      issuer: 'https://accounts.google.com',
      audience: GOOGLE_CLIENT_IDS,
    });

    // Map Google token payload to match Firebase format
    return {
      sub: payload.sub, // User ID
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      email_verified: payload.email_verified,
      // Add Firebase-like fields for compatibility
      user_id: payload.sub,
    };
  } catch (googleError) {
    console.error('Token verification failed (both Firebase and Google):', googleError);
    return null;
  }
}

