import { Router, IRequest } from 'itty-router';
import { json } from '../utils/http';
import { verifyFirebaseToken } from '../auth';

// Define Env interface for Cloudflare Bindings
export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  DISCORD_WEBHOOK_URL: string;
  DB: D1Database;
}

// Middleware to authenticate requests
const withAuth = async (request: IRequest, env: Env) => {
  const user = await verifyFirebaseToken(request, env);
  if (!user) {
    return json(401, { status: 401, error: 'Unauthorized' });
  }
  request.user = user;
};

export const notificationsRouter = Router();

// Protected: Register FCM Token
notificationsRouter.post('/notifications/token', withAuth, async (request, env) => {
  const user = request.user;
  const body = await request.json() as any;

  if (!body.token) {
    return json(400, { status: 400, error: 'FCM token is required' });
  }

  try {
    const now = new Date().toISOString();

    // Insert or update FCM token
    await env.DB.prepare(`
      INSERT INTO fcm_tokens (user_id, token, device_id, device_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, token) DO UPDATE SET
        device_id = excluded.device_id,
        device_type = excluded.device_type,
        updated_at = excluded.updated_at
    `).bind(
      user.sub,
      body.token,
      body.deviceId || null,
      body.deviceType || 'unknown',
      now,
      now
    ).run();

    return { success: true, message: 'FCM token registered' };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Remove FCM Token
notificationsRouter.delete('/notifications/token', withAuth, async (request, env) => {
  const user = request.user;
  const body = await request.json() as any;

  if (!body.token) {
    return json(400, { status: 400, error: 'FCM token is required' });
  }

  try {
    await env.DB.prepare(
      'DELETE FROM fcm_tokens WHERE user_id = ? AND token = ?'
    ).bind(user.sub, body.token).run();

    return { success: true, message: 'FCM token removed' };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Get Notifications
notificationsRouter.get('/notifications', withAuth, async (request, env) => {
  const user = request.user;
  const { limit, offset, unreadOnly } = request.query;

  const limitNum = parseInt(limit as string) || 50;
  const offsetNum = parseInt(offset as string) || 0;
  const unreadOnlyBool = unreadOnly === 'true';

  try {
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: any[] = [user.sub];

    if (unreadOnlyBool) {
      query += ' AND is_read = 0';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offsetNum);

    const { results } = await env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?';
    const countParams: any[] = [user.sub];

    if (unreadOnlyBool) {
      countQuery += ' AND is_read = 0';
    }

    const totalResult = await env.DB.prepare(countQuery).bind(...countParams).first();
    const total = (totalResult as any)?.count || 0;

    const notifications = results.map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data ? JSON.parse(n.data) : null,
      isRead: n.is_read === 1,
      createdAt: n.created_at,
    }));

    return {
      notifications,
      total,
      hasMore: offsetNum + limitNum < total
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Mark Notification as Read
notificationsRouter.patch('/notifications/:id/read', withAuth, async (request, env) => {
  const user = request.user;
  const { id } = request.params;

  try {
    const notification = await env.DB.prepare(
      'SELECT user_id FROM notifications WHERE id = ?'
    ).bind(id).first();

    if (!notification) {
      return json(404, { status: 404, error: 'Notification not found' });
    }

    if (notification.user_id !== user.sub) {
      return json(403, { status: 403, error: 'Not your notification' });
    }

    await env.DB.prepare(
      'UPDATE notifications SET is_read = 1 WHERE id = ?'
    ).bind(id).run();

    return { success: true };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Mark All Notifications as Read
notificationsRouter.post('/notifications/read-all', withAuth, async (request, env) => {
  const user = request.user;

  try {
    await env.DB.prepare(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
    ).bind(user.sub).run();

    return { success: true };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Get Notification Preferences
notificationsRouter.get('/notifications/preferences', withAuth, async (request, env) => {
  const user = request.user;

  try {
    let prefs = await env.DB.prepare(
      'SELECT * FROM notification_preferences WHERE user_id = ?'
    ).bind(user.sub).first();

    // Create default preferences if they don't exist
    if (!prefs) {
      const now = new Date().toISOString();
      await env.DB.prepare(`
        INSERT INTO notification_preferences (user_id, created_at, updated_at)
        VALUES (?, ?, ?)
      `).bind(user.sub, now, now).run();

      prefs = await env.DB.prepare(
        'SELECT * FROM notification_preferences WHERE user_id = ?'
      ).bind(user.sub).first();

      if (!prefs) {
        return json(500, { status: 500, error: 'Failed to create notification preferences' });
      }
    }

    // TypeScript doesn't recognize the early return, so we assert non-null
    const preferences = prefs as any;

    return {
      messagesEnabled: preferences.messages_enabled === 1,
      followsEnabled: preferences.follows_enabled === 1,
      postsEnabled: preferences.posts_enabled === 1,
      likesEnabled: preferences.likes_enabled === 1,
      commentsEnabled: preferences.comments_enabled === 1,
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Update Notification Preferences
notificationsRouter.patch('/notifications/preferences', withAuth, async (request, env) => {
  const user = request.user;
  const body = await request.json() as any;

  try {
    const updates: string[] = [];
    const params: any[] = [];

    if (body.messagesEnabled !== undefined) {
      updates.push('messages_enabled = ?');
      params.push(body.messagesEnabled ? 1 : 0);
    }
    if (body.followsEnabled !== undefined) {
      updates.push('follows_enabled = ?');
      params.push(body.followsEnabled ? 1 : 0);
    }
    if (body.postsEnabled !== undefined) {
      updates.push('posts_enabled = ?');
      params.push(body.postsEnabled ? 1 : 0);
    }
    if (body.likesEnabled !== undefined) {
      updates.push('likes_enabled = ?');
      params.push(body.likesEnabled ? 1 : 0);
    }
    if (body.commentsEnabled !== undefined) {
      updates.push('comments_enabled = ?');
      params.push(body.commentsEnabled ? 1 : 0);
    }

    if (updates.length === 0) {
      return json(400, { status: 400, error: 'No preferences to update' });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(user.sub);

    await env.DB.prepare(`
      UPDATE notification_preferences
      SET ${updates.join(', ')}
      WHERE user_id = ?
    `).bind(...params).run();

    return { success: true };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});
