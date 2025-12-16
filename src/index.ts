import { Router, cors } from 'itty-router';
import { json } from './utils/http';

// Import route modules
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { clubsRouter } from './routes/clubs';
import { postsRouter } from './routes/posts';
import { commentsRouter } from './routes/comments';
import { messagesRouter } from './routes/messages';
import { notificationsRouter } from './routes/notifications';
import { searchRouter } from './routes/search';
import { eventsRouter } from './routes/events';
import { adminRouter } from './routes/admin';

// Define Env interface for Cloudflare Bindings
export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  DISCORD_WEBHOOK_URL: string;
  DB: D1Database;
}

const { preflight, corsify } = cors();

// Create basic router (not AutoRouter to avoid broken error() function)
const router = Router();

// Health check
router.get('/', () => ({ message: 'LeoConnect Backend is running with D1!' }));

// Mount all route modules
router.all('*', authRouter.fetch);
router.all('*', usersRouter.fetch);
router.all('*', clubsRouter.fetch);
router.all('*', postsRouter.fetch);
router.all('*', commentsRouter.fetch);
router.all('*', messagesRouter.fetch);
router.all('*', notificationsRouter.fetch);
router.all('*', searchRouter.fetch);
router.all('*', eventsRouter.fetch);
router.all('*', adminRouter.fetch);

// 404 handler
router.all('*', () => json(404, { status: 404, error: 'Not Found' }));

// Export custom worker handler with manual error handling
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return corsify(new Response(null, { status: 204 }));
      }

      const response = await router.fetch(request, env, ctx);

      // Convert plain objects to JSON responses
      if (response && !(response instanceof Response)) {
        return corsify(json(200, response));
      }

      return corsify(response || json(404, { status: 404, error: 'Not Found' }));
    } catch (e: any) {
      console.error('Error:', e);
      return corsify(json(500, { status: 500, error: e?.message ?? String(e) }));
    }
  }
};
