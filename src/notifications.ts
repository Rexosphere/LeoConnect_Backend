// Firebase Cloud Messaging notification service

interface NotificationData {
  type: 'message' | 'follow' | 'post' | 'like' | 'comment';
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface FCMMessage {
  token: string;
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  android?: {
    priority: 'high' | 'normal';
  };
  apns?: {
    payload: {
      aps: {
        sound: string;
      };
    };
  };
}

export async function sendNotification(
  db: D1Database,
  userId: string,
  notification: NotificationData,
  env: any
): Promise<void> {
  try {
    // Check if user has notifications enabled for this type
    const prefs = await db.prepare(
      'SELECT * FROM notification_preferences WHERE user_id = ?'
    ).bind(userId).first();

    // If no preferences exist, create default ones (all enabled)
    if (!prefs) {
      await db.prepare(`
        INSERT INTO notification_preferences (user_id)
        VALUES (?)
      `).bind(userId).run();
    } else {
      // Check if this notification type is enabled
      const typeEnabled = prefs[`${notification.type}s_enabled`];
      if (typeEnabled === 0) {
        console.log(`Notifications disabled for user ${userId}, type ${notification.type}`);
        return;
      }
    }

    // Save notification to database
    const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, body, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      notificationId,
      userId,
      notification.type,
      notification.title,
      notification.body,
      notification.data ? JSON.stringify(notification.data) : null,
      new Date().toISOString()
    ).run();

    // Get user's FCM tokens
    const { results: tokens } = await db.prepare(
      'SELECT token FROM fcm_tokens WHERE user_id = ?'
    ).bind(userId).all();

    if (tokens.length === 0) {
      console.log(`No FCM tokens found for user ${userId}`);
      return;
    }

    // Send FCM notification to all user's devices
    const fcmMessages: FCMMessage[] = tokens.map((t: any) => ({
      token: t.token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        notificationId,
        type: notification.type,
        ...notification.data,
      },
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    }));

    // Send notifications using Firebase Admin SDK
    // Note: This requires Firebase Admin SDK to be properly configured
    // For Cloudflare Workers, we'll use the REST API instead
    await sendFCMNotifications(fcmMessages, env);

  } catch (error) {
    console.error('Error sending notification:', error);
    // Don't throw - notifications are non-critical
  }
}

async function sendFCMNotifications(messages: FCMMessage[], env: any): Promise<void> {
  // Get Firebase access token using service account
  const accessToken = await getFirebaseAccessToken(env);

  if (!accessToken) {
    console.error('Failed to get Firebase access token');
    return;
  }

  // Send each message (in production, use batch sending)
  const promises = messages.map(async (message) => {
    try {
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('FCM send error:', error);
      }
    } catch (error) {
      console.error('Error sending FCM message:', error);
    }
  });

  await Promise.all(promises);
}

async function getFirebaseAccessToken(env: any): Promise<string | null> {
  try {
    // Create JWT for Firebase service account
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: env.FIREBASE_CLIENT_EMAIL,
      sub: env.FIREBASE_CLIENT_EMAIL,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    };

    // Sign JWT with private key
    const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    // For Cloudflare Workers, we need to use Web Crypto API
    // This is a simplified version - in production, use a proper JWT library
    const encoder = new TextEncoder();
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payloadStr = btoa(JSON.stringify(payload));

    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToArrayBuffer(privateKey),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      encoder.encode(`${header}.${payloadStr}`)
    );

    const jwt = `${header}.${payloadStr}.${arrayBufferToBase64(signature)}`;

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      console.error('Failed to get access token:', await response.text());
      return null;
    }

    const data = await response.json() as any;
    return data.access_token;
  } catch (error) {
    console.error('Error getting Firebase access token:', error);
    return null;
  }
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper functions for specific notification types
export async function notifyNewMessage(
  db: D1Database,
  receiverId: string,
  senderName: string,
  messagePreview: string,
  env: any
): Promise<void> {
  await sendNotification(db, receiverId, {
    type: 'message',
    title: `New message from ${senderName}`,
    body: messagePreview,
    data: {
      senderId: receiverId,
    },
  }, env);
}

export async function notifyNewFollow(
  db: D1Database,
  followedUserId: string,
  followerName: string,
  followerId: string,
  env: any
): Promise<void> {
  await sendNotification(db, followedUserId, {
    type: 'follow',
    title: 'New follower',
    body: `${followerName} started following you`,
    data: {
      followerId,
    },
  }, env);
}

export async function notifyNewPostFromFollowing(
  db: D1Database,
  followerId: string,
  authorName: string,
  postId: string,
  postPreview: string,
  env: any
): Promise<void> {
  await sendNotification(db, followerId, {
    type: 'post',
    title: `New post from ${authorName}`,
    body: postPreview,
    data: {
      postId,
    },
  }, env);
}

export async function notifyNewLike(
  db: D1Database,
  postAuthorId: string,
  likerName: string,
  postId: string,
  env: any
): Promise<void> {
  await sendNotification(db, postAuthorId, {
    type: 'like',
    title: 'New like',
    body: `${likerName} liked your post`,
    data: {
      postId,
    },
  }, env);
}

export async function notifyNewComment(
  db: D1Database,
  postAuthorId: string,
  commenterName: string,
  postId: string,
  commentPreview: string,
  env: any
): Promise<void> {
  await sendNotification(db, postAuthorId, {
    type: 'comment',
    title: 'New comment',
    body: `${commenterName}: ${commentPreview}`,
    data: {
      postId,
    },
  }, env);
}
