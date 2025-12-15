import { AutoRouter, cors } from 'itty-router';

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

// Create main router
const router = AutoRouter({
  before: [preflight],
  finally: [corsify],
});

// Health check
router.get('/', () => ({ message: 'LeoConnect Backend is running with D1!' }));

// Mount all route modules
router.all('*', authRouter);
router.all('*', usersRouter);
router.all('*', clubsRouter);
router.all('*', postsRouter);
router.all('*', commentsRouter);
router.all('*', messagesRouter);
router.all('*', notificationsRouter);
router.all('*', searchRouter);
router.all('*', eventsRouter);
router.all('*', adminRouter);

// Export router as default Cloudflare Worker handler
export default router;
