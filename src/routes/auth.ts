import { Router, IRequest } from 'itty-router';
import { json } from '../utils/http';
import { Env } from '../index';
import { verifyFirebaseToken } from '../auth';
import { getUserCounts } from '../helpers';
import { mapToUserProfile } from '../models';
import { verifyAdminPassword } from '../middleware/auth';

export const authRouter = Router();

const ADMIN_API_KEY = 'leo-admin-secret-2024';

// Public: Auth with Google/Firebase
authRouter.post('/auth/google', async (request: IRequest, env: Env) => {
  const token = request.headers.get('Authorization')?.split(' ')[1];
  if (!token) return json(400, { status: 400, error: 'Missing token' });

  const payload = await verifyFirebaseToken(request, env);

  if (!payload || !payload.sub) {
    return json(401, { status: 401, error: 'Invalid token' });
  }

  const uid = payload.sub;
  const email = (payload.email as string) || '';
  const name = (payload.name as string) || email;
  const picture = (payload.picture as string) || '';

  // Check if user exists
  let user: any = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(uid).first();

  if (!user) {
    // Create new user
    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO users (uid, email, display_name, photo_url, onboarding_completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(uid, email, name, picture, false, now, now).run();

    user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(uid).first();
  }

  // Fetch following clubs
  const followingClubsResult = await env.DB.prepare('SELECT club_id FROM user_following_clubs WHERE user_id = ?').bind(uid).all();
  const followingClubs = followingClubsResult.results.map((r: any) => r.club_id);

  // Compute counts from relationships
  const counts = await getUserCounts(env.DB, uid);

  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.display_name,
    photoURL: user.photo_url,
    leoId: user.leo_id,
    bio: user.bio,
    isWebmaster: user.is_webmaster === 1,
    isVerified: user.is_verified === 1,
    assignedClubId: user.assigned_club_id,
    followingClubs: followingClubs,
    onboardingCompleted: user.onboarding_completed === 1,
    ...counts
  };

  return mapToUserProfile(userData, uid);
});

// Admin Login - with SHA-256 password verification
authRouter.post('/admin/login', async (request: IRequest, env: Env) => {
  const body = await request.json() as { email: string; password: string };

  if (!body.email || !body.password) {
    return json(400, { status: 400, error: 'Email and password required' });
  }

  const adminEmail = 'admin@leoconnect.com';
  // SHA-256 hash of 'LeoAdmin2024!'
  const adminPasswordHash = '909d7529e750eaacb1efca6dd50da55e197a4b1e0cf528e3d5c8e615c2167cab';

  if (body.email !== adminEmail) {
    return json(401, { status: 401, error: 'Invalid credentials' });
  }

  const isValid = await verifyAdminPassword(body.password, adminPasswordHash);
  if (!isValid) {
    return json(401, { status: 401, error: 'Invalid credentials' });
  }

  return {
    success: true,
    user: { email: adminEmail, name: 'Admin' },
    apiKey: ADMIN_API_KEY
  };
});
