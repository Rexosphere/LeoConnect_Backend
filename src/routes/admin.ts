import { AutoRouter, IRequest, error } from 'itty-router';
import { withAdminAuth, verifyAdminPassword } from '../middleware/auth';
import { Env } from '../index';
import { getPostCounts } from '../helpers';

export const adminRouter = AutoRouter();

// Admin constants
const ADMIN_API_KEY = 'leo-admin-secret-2024';

// Admin Login - with SHA-256 password verification
adminRouter.post('/admin/login', async (request: IRequest, env: Env) => {
  const body = await request.json() as { email: string; password: string };

  if (!body.email || !body.password) {
    return error(400, 'Email and password required');
  }

  const adminEmail = 'admin@leoconnect.com';
  // SHA-256 hash of 'LeoAdmin2024!'
  const adminPasswordHash = '909d7529e750eaacb1efca6dd50da55e197a4b1e0cf528e3d5c8e615c2167cab';

  if (body.email !== adminEmail) {
    return error(401, 'Invalid credentials');
  }

  const isValid = await verifyAdminPassword(body.password, adminPasswordHash);
  if (!isValid) {
    return error(401, 'Invalid credentials');
  }

  return {
    success: true,
    user: { email: adminEmail, name: 'Admin' },
    apiKey: ADMIN_API_KEY
  };
});

// Admin: Get dashboard statistics
adminRouter.get('/admin/stats', withAdminAuth, async (request, env) => {
  try {
    const usersCount = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
    const clubsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM clubs').first();
    const postsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM posts').first();
    const messagesCount = await env.DB.prepare('SELECT COUNT(*) as count FROM messages').first();
    const districtsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM districts').first();
    const commentsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM comments').first();

    return {
      users: usersCount?.count || 0,
      clubs: clubsCount?.count || 0,
      posts: postsCount?.count || 0,
      messages: messagesCount?.count || 0,
      districts: districtsCount?.count || 0,
      comments: commentsCount?.count || 0
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Get all users
adminRouter.get('/admin/users', withAdminAuth, async (request, env) => {
  const { limit, offset, search } = request.query;
  const limitNum = parseInt(limit as string) || 50;
  const offsetNum = parseInt(offset as string) || 0;

  try {
    let query = 'SELECT * FROM users';
    const params: any[] = [];

    if (search) {
      query += ' WHERE display_name LIKE ? OR email LIKE ? OR leo_id LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offsetNum);

    const { results } = await env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM users';
    if (search) {
      countQuery += ' WHERE display_name LIKE ? OR email LIKE ? OR leo_id LIKE ?';
      const searchPattern = `%${search}%`;
      const totalResult = await env.DB.prepare(countQuery).bind(searchPattern, searchPattern, searchPattern).first();
      return { users: results, total: totalResult?.count || 0 };
    }

    const totalResult = await env.DB.prepare(countQuery).first();
    return { users: results, total: totalResult?.count || 0 };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Create User
adminRouter.post('/admin/users', withAdminAuth, async (request: IRequest, env: Env) => {
  const body = await request.json() as any;

  if (!body.email || !body.display_name) {
    return error(400, 'Email and display name are required');
  }

  try {
    const uid = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO users (uid, email, display_name, photo_url, leo_id, bio, is_webmaster, assigned_club_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      uid, body.email, body.display_name, body.photo_url || null, body.leo_id || null,
      body.bio || null, body.is_webmaster ? 1 : 0, body.assigned_club_id || null, now, now
    ).run();

    const user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(uid).first();
    return { success: true, user };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Update a user (edit Leo ID, etc.)
adminRouter.put('/admin/users/:id', withAdminAuth, async (request: IRequest, env: Env) => {
  const { id } = request.params;
  const body = await request.json() as any;

  try {
    const now = new Date().toISOString();

    // Build dynamic UPDATE query - only update fields that are explicitly provided
    const updates: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (body.leo_id !== undefined) {
      updates.push('leo_id = ?');
      params.push(body.leo_id || null);
    }

    if (body.display_name !== undefined) {
      updates.push('display_name = ?');
      params.push(body.display_name || null);
    }

    if (body.bio !== undefined) {
      updates.push('bio = ?');
      params.push(body.bio || null);
    }

    if (body.is_webmaster !== undefined) {
      updates.push('is_webmaster = ?');
      params.push(body.is_webmaster ? 1 : 0);
    }

    if (body.is_verified !== undefined) {
      updates.push('is_verified = ?');
      params.push(body.is_verified ? 1 : 0);
    }

    if (body.assigned_club_id !== undefined) {
      updates.push('assigned_club_id = ?');
      params.push(body.assigned_club_id || null);
    }

    params.push(id); // For WHERE clause

    await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE uid = ?`).bind(...params).run();

    const user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(id).first();
    return { success: true, user };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Delete a user
adminRouter.delete('/admin/users/:id', withAdminAuth, async (request, env) => {
  const { id } = request.params;
  try {
    await env.DB.prepare('DELETE FROM users WHERE uid = ?').bind(id).run();
    return { success: true };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Get all clubs
adminRouter.get('/admin/clubs', withAdminAuth, async (request, env) => {
  const { limit, offset, search } = request.query;
  const limitNum = parseInt(limit as string) || 50;
  const offsetNum = parseInt(offset as string) || 0;

  try {
    let query = 'SELECT * FROM clubs';
    const params: any[] = [];

    if (search) {
      query += ' WHERE name LIKE ? OR district LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(limitNum, offsetNum);

    const { results } = await env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM clubs';
    if (search) {
      countQuery += ' WHERE name LIKE ? OR district LIKE ?';
      const searchPattern = `%${search}%`;
      const totalResult = await env.DB.prepare(countQuery).bind(searchPattern, searchPattern).first();
      return { clubs: results, total: totalResult?.count || 0 };
    }

    const totalResult = await env.DB.prepare(countQuery).first();
    return { clubs: results, total: totalResult?.count || 0 };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Create Club
adminRouter.post('/admin/clubs', withAdminAuth, async (request: IRequest, env: Env) => {
  const body = await request.json() as any;

  if (!body.name || !body.district || !body.district_id) {
    return error(400, 'Name, district, and district_id are required');
  }

  try {
    const clubId = `club-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO clubs (id, name, district, district_id, description, logo_url, cover_image_url,
        email, phone, address, facebook_url, instagram_url, twitter_url, is_official, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      clubId, body.name, body.district, body.district_id, body.description || null,
      body.logo_url || null, body.cover_image_url || null, body.email || null, body.phone || null,
      body.address || null, body.facebook_url || null, body.instagram_url || null,
      body.twitter_url || null, body.is_official ? 1 : 0, now, now
    ).run();

    await env.DB.prepare('UPDATE districts SET total_clubs = total_clubs + 1 WHERE name = ?').bind(body.district).run();

    const club = await env.DB.prepare('SELECT * FROM clubs WHERE id = ?').bind(clubId).first();
    return { success: true, club };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Update Club
adminRouter.put('/admin/clubs/:id', withAdminAuth, async (request: IRequest, env: Env) => {
  const { id } = request.params;
  const body = await request.json() as any;

  try {
    const now = new Date().toISOString();

    await env.DB.prepare(`
      UPDATE clubs SET
        name = COALESCE(?, name), district = COALESCE(?, district), district_id = COALESCE(?, district_id),
        description = COALESCE(?, description), logo_url = COALESCE(?, logo_url), cover_image_url = COALESCE(?, cover_image_url),
        email = COALESCE(?, email), phone = COALESCE(?, phone), address = COALESCE(?, address),
        facebook_url = COALESCE(?, facebook_url), instagram_url = COALESCE(?, instagram_url),
        twitter_url = COALESCE(?, twitter_url), is_official = COALESCE(?, is_official), updated_at = ?
      WHERE id = ?
    `).bind(
      body.name || null, body.district || null, body.district_id || null, body.description || null,
      body.logo_url || null, body.cover_image_url || null, body.email || null, body.phone || null,
      body.address || null, body.facebook_url || null, body.instagram_url || null, body.twitter_url || null,
      body.is_official !== undefined ? (body.is_official ? 1 : 0) : null, now, id
    ).run();

    const club = await env.DB.prepare('SELECT * FROM clubs WHERE id = ?').bind(id).first();
    return { success: true, club };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Delete Club
adminRouter.delete('/admin/clubs/:id', withAdminAuth, async (request: IRequest, env: Env) => {
  const { id } = request.params;

  try {
    const club = await env.DB.prepare('SELECT district FROM clubs WHERE id = ?').bind(id).first();
    await env.DB.prepare('DELETE FROM clubs WHERE id = ?').bind(id).run();
    if (club?.district) {
      await env.DB.prepare('UPDATE districts SET total_clubs = MAX(0, total_clubs - 1) WHERE name = ?').bind(club.district).run();
    }
    return { success: true };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Get all districts with club counts
adminRouter.get('/admin/districts', withAdminAuth, async (request, env) => {
  try {
    const { results: districts } = await env.DB.prepare('SELECT * FROM districts').all();

    // Get club counts per district
    const districtsWithCounts = await Promise.all(districts.map(async (d: any) => {
      const countResult = await env.DB.prepare('SELECT COUNT(*) as count FROM clubs WHERE district = ?').bind(d.name).first();
      return {
        ...d,
        clubs_count: countResult?.count || 0
      };
    }));

    return { districts: districtsWithCounts, total: districts.length };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Create District
adminRouter.post('/admin/districts', withAdminAuth, async (request: IRequest, env: Env) => {
  const body = await request.json() as any;

  if (!body.name) {
    return error(400, 'District name is required');
  }

  try {
    await env.DB.prepare(`INSERT INTO districts (name, total_clubs, total_members) VALUES (?, ?, ?)`)
      .bind(body.name, body.total_clubs || 0, body.total_members || 0).run();
    const district = await env.DB.prepare('SELECT * FROM districts WHERE name = ?').bind(body.name).first();
    return { success: true, district };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Delete District
adminRouter.delete('/admin/districts/:name', withAdminAuth, async (request: IRequest, env: Env) => {
  const { name } = request.params;

  try {
    await env.DB.prepare('DELETE FROM districts WHERE name = ?').bind(name).run();
    return { success: true };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Get all posts
adminRouter.get('/admin/posts', withAdminAuth, async (request, env) => {
  const { limit, offset, search } = request.query;
  const limitNum = parseInt(limit as string) || 50;
  const offsetNum = parseInt(offset as string) || 0;

  try {
    let query = `
      SELECT p.*, u.display_name as author_name, u.photo_url as author_logo, c.name as club_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.uid
      LEFT JOIN clubs c ON p.club_id = c.id
    `;
    const params: any[] = [];

    if (search) {
      query += ' WHERE p.content LIKE ? OR u.display_name LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offsetNum);

    const { results } = await env.DB.prepare(query).bind(...params).all();

    // Get counts for each post
    const postsWithCounts = await Promise.all(results.map(async (p: any) => {
      const counts = await getPostCounts(env.DB, p.id);
      return { ...p, ...counts };
    }));

    // Get total count
    let countQuery = 'SELECT COUNT(*) as count FROM posts';
    if (search) {
      countQuery = `
        SELECT COUNT(*) as count FROM posts p
        LEFT JOIN users u ON p.author_id = u.uid
        WHERE p.content LIKE ? OR u.display_name LIKE ?
      `;
      const searchPattern = `%${search}%`;
      const totalResult = await env.DB.prepare(countQuery).bind(searchPattern, searchPattern).first();
      return { posts: postsWithCounts, total: totalResult?.count || 0 };
    }

    const totalResult = await env.DB.prepare(countQuery).first();
    return { posts: postsWithCounts, total: totalResult?.count || 0 };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Delete a post
adminRouter.delete('/admin/posts/:id', withAdminAuth, async (request, env) => {
  const { id } = request.params;
  try {
    await env.DB.prepare('DELETE FROM comments WHERE post_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM post_likes WHERE post_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
    return { success: true };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Get all messages
adminRouter.get('/admin/messages', withAdminAuth, async (request, env) => {
  const { limit, offset } = request.query;
  const limitNum = parseInt(limit as string) || 50;
  const offsetNum = parseInt(offset as string) || 0;

  try {
    const { results } = await env.DB.prepare(`
      SELECT m.*,
             s.display_name as sender_name, s.photo_url as sender_photo,
             r.display_name as receiver_name, r.photo_url as receiver_photo
      FROM messages m
      LEFT JOIN users s ON m.sender_id = s.uid
      LEFT JOIN users r ON m.receiver_id = r.uid
      ORDER BY m.created_at DESC LIMIT ? OFFSET ?
    `).bind(limitNum, offsetNum).all();

    const totalResult = await env.DB.prepare('SELECT COUNT(*) as count FROM messages').first();
    return { messages: results, total: totalResult?.count || 0 };
  } catch (e: any) {
    return error(500, e.message);
  }
});
