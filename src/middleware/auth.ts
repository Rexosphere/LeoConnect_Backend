import { IRequest, error } from 'itty-router';
import { verifyFirebaseToken } from '../auth';
import { Env } from '../index';

// Middleware to authenticate requests with Firebase token
export const withAuth = async (request: IRequest, env: Env) => {
  const user = await verifyFirebaseToken(request, env);
  if (!user) {
    return error(401, 'Unauthorized');
  }
  request.user = user;
};

// Admin authentication middleware - uses hardcoded API key
const ADMIN_API_KEY = 'leo-admin-secret-2024';

export const withAdminAuth = (request: IRequest, env: Env) => {
  const apiKey = request.headers.get('X-Admin-Key');
  if (apiKey !== ADMIN_API_KEY) {
    return error(401, 'Invalid admin key');
  }
};

// Simple password hash verification (using SHA-256 for Cloudflare Workers compatibility)
export async function verifyAdminPassword(password: string, hash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === hash;
}
