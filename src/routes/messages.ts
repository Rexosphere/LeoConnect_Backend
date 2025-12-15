import { AutoRouter, IRequest, error } from 'itty-router';
import { Env } from '../index';
import { withAuth } from '../middleware/auth';
import { notifyNewMessage } from '../notifications';

export const messagesRouter = AutoRouter();

// Protected: Send Message
messagesRouter.post('/messages', withAuth, async (request: IRequest, env: Env) => {
  const user = request.user;
  const body = await request.json() as any;

  if (!body.receiverId || !body.content) {
    return error(400, 'Missing receiverId or content');
  }

  try {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
        INSERT INTO messages (id, sender_id, receiver_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).bind(messageId, user.sub, body.receiverId, body.content, now).run();

    // Send notification to receiver
    const senderName = user.name || user.email || 'Someone';
    const messagePreview = body.content.substring(0, 100);
    await notifyNewMessage(env.DB, body.receiverId, senderName, messagePreview, env).catch(err => {
      console.error('Failed to send message notification:', err);
    });

    return {
      id: messageId,
      senderId: user.sub,
      receiverId: body.receiverId,
      content: body.content,
      isRead: false,
      createdAt: now
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Conversations
messagesRouter.get('/conversations', withAuth, async (request: IRequest, env: Env) => {
  const user = request.user;

  try {
    // Get latest message for each conversation
    // This is a bit complex in SQL. We need to find unique pairs of users and get the latest message.
    // A simpler approach for D1/SQLite:
    // 1. Get all messages where user is sender or receiver
    // 2. Group by the OTHER user in code (or complex SQL)

    // Let's try a SQL approach to get the other user ID and max timestamp
    const query = `
      SELECT
        CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user_id,
        content,
        created_at,
        is_read,
        sender_id
      FROM messages
      WHERE sender_id = ? OR receiver_id = ?
      ORDER BY created_at DESC
    `;

    const { results } = await env.DB.prepare(query).bind(user.sub, user.sub, user.sub).all();

    const conversationsMap = new Map();

    for (const msg of results) {
      const otherUserId = msg.other_user_id;
      if (!conversationsMap.has(otherUserId)) {
        conversationsMap.set(otherUserId, {
          userId: otherUserId,
          lastMessage: msg.content,
          lastMessageAt: msg.created_at,
          unreadCount: (msg.receiver_id === user.sub && msg.is_read === 0) ? 1 : 0 // This logic is flawed for count, but good for "is latest unread"
        });
      } else {
        // If we want to count unread messages, we can iterate all.
        // But for now let's just get the list of users and fetch details.
      }
    }

    const conversationUserIds = Array.from(conversationsMap.keys());

    // Fetch user details for these users
    // In a real app, use WHERE IN (?) but D1 might not support array binding easily yet.
    // We'll fetch one by one or all users (if small). Let's fetch one by one for now.

    const conversations = await Promise.all(conversationUserIds.map(async (uid) => {
      const userDoc = await env.DB.prepare('SELECT display_name, photo_url FROM users WHERE uid = ?').bind(uid).first();
      const conv = conversationsMap.get(uid);

      // Count unread messages from this user
      const unread = await env.DB.prepare('SELECT COUNT(*) as count FROM messages WHERE sender_id = ? AND receiver_id = ? AND is_read = 0').bind(uid, user.sub).first();

      return {
        userId: uid,
        displayName: userDoc ? userDoc.display_name : 'Unknown User',
        photoUrl: userDoc ? userDoc.photo_url : null,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: unread ? unread.count : 0
      };
    }));

    return conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Messages with User
messagesRouter.get('/messages/:userId', withAuth, async (request: IRequest, env: Env) => {
  const user = request.user;
  const { userId } = request.params;

  try {
    const { results } = await env.DB.prepare(`
        SELECT * FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at ASC
    `).bind(user.sub, userId, userId, user.sub).all();

    // Mark as read (async, don't wait)
    env.DB.prepare('UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?').bind(userId, user.sub).run();

    return results.map((m: any) => ({
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      content: m.content,
      isRead: m.is_read === 1,
      createdAt: m.created_at
    }));
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Delete Message
messagesRouter.delete('/messages/:id', withAuth, async (request: IRequest, env: Env) => {
  const user = request.user;
  const { id } = request.params;

  try {
    const message = await env.DB.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first();
    if (!message) return error(404, 'Message not found');

    // Only sender can delete for now (or maybe receiver too? Let's allow sender)
    if (message.sender_id !== user.sub) {
      return error(403, 'You can only delete your own messages');
    }

    await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
    return { success: true };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Delete Conversation
messagesRouter.delete('/conversations/:userId', withAuth, async (request: IRequest, env: Env) => {
  const user = request.user;
  const { userId } = request.params;

  try {
    // Delete all messages between these two users
    await env.DB.prepare(`
        DELETE FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `).bind(user.sub, userId, userId, user.sub).run();

    return { success: true };
  } catch (e: any) {
    return error(500, e.message);
  }
});
