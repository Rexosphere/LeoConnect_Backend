import { AutoRouter, IRequest, error } from 'itty-router';
import { Env } from '../index';
import { withAuth } from '../middleware/auth';
import { mapToClub, mapToPost } from '../models';
import { getClubCounts, isUserFollowingUser } from '../helpers';

export const clubsRouter = AutoRouter();

// Public: Get Districts
clubsRouter.get('/districts', async (request: IRequest, env: Env) => {
  try {
    const { results } = await env.DB.prepare('SELECT name FROM districts ORDER BY name').all();
    return results.map((d: any) => d.name);
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Public: Get Clubs by District
clubsRouter.get('/clubs', async (request: IRequest, env: Env) => {
  const { district } = request.query;
  try {
    let query = 'SELECT * FROM clubs';
    let params: any[] = [];

    if (district) {
      query += ' WHERE district = ?';
      params.push(district);
    }

    const { results } = await env.DB.prepare(query).bind(...params).all();

    return results.map((c: any) => mapToClub({
      id: c.id,
      name: c.name,
      district: c.district,
      districtId: c.district_id,
      description: c.description,
      logoUrl: c.logo_url,
      coverImageUrl: c.cover_image_url,
      membersCount: c.members_count,
      followersCount: c.followers_count,
      postsCount: c.posts_count,
      isOfficial: c.is_official === 1,
      address: c.address,
      email: c.email,
      phone: c.phone,
      socialLinks: {
        facebook: c.facebook_url,
        instagram: c.instagram_url,
        twitter: c.twitter_url
      }
    }, c.id));
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Public: Get Posts by Club
clubsRouter.get('/clubs/:id/posts', async (request: IRequest, env: Env) => {
  const { id } = request.params;

  try {
    const { results } = await env.DB.prepare(`
        SELECT p.*, u.display_name as author_name, u.photo_url as author_logo, c.name as club_name
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.uid
        LEFT JOIN clubs c ON p.club_id = c.id
        WHERE p.club_id = ?
        ORDER BY p.created_at DESC
    `).bind(id).all();

    const posts = await Promise.all(results.map(async (p: any) => {
      let isLiked = false;
      // TODO: If we have userSub, check likes

      // Parse images from images_json or fallback to imageUrl
      let images: string[] = [];
      if (p.images_json) {
        try {
          images = JSON.parse(p.images_json);
        } catch (e) {
          console.error('Failed to parse images_json:', e);
        }
      }
      if (images.length === 0 && p.image_url) {
        images = [p.image_url];
      }

      const postData = {
        id: p.id,
        clubId: p.club_id,
        clubName: p.club_name,
        authorId: p.author_id,
        authorName: p.author_name,
        authorLogo: p.author_logo,
        content: p.content,
        imageUrl: p.image_url,
        images: images,
        likesCount: p.likes_count,
        commentsCount: p.comments_count,
        sharesCount: p.shares_count,
        isPinned: p.is_pinned === 1,
        timestamp: p.created_at,
        updatedAt: p.updated_at
      };

      const post = mapToPost(postData, p.id);
      post.isLikedByUser = isLiked;
      return post;
    }));

    return posts;
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Follow Club
clubsRouter.post('/clubs/:id/follow', withAuth, async (request: IRequest, env: Env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Check if club exists
    const club = await env.DB.prepare('SELECT id FROM clubs WHERE id = ?').bind(id).first();
    if (!club) {
      return error(404, 'Club not found');
    }

    // Check if already following
    const existing = await env.DB.prepare(
      'SELECT 1 FROM user_following_clubs WHERE user_id = ? AND club_id = ?'
    ).bind(user.sub, id).first();

    if (existing) {
      return error(400, 'Already following this club');
    }

    // Create follow relationship
    await env.DB.prepare(
      'INSERT INTO user_following_clubs (user_id, club_id) VALUES (?, ?)'
    ).bind(user.sub, id).run();

    // Get updated counts
    const counts = await getClubCounts(env.DB, id);

    return {
      isFollowing: true,
      followersCount: counts.followersCount
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Club Followers
clubsRouter.get('/clubs/:id/followers', withAuth, async (request: IRequest, env: Env) => {
  const { id } = request.params;
  const { limit, offset } = request.query;
  const currentUser = request.user;

  const limitNum = parseInt(limit as string) || 50;
  const offsetNum = parseInt(offset as string) || 0;

  try {
    // Check if club exists
    const club = await env.DB.prepare('SELECT id FROM clubs WHERE id = ?').bind(id).first();
    if (!club) {
      return error(404, 'Club not found');
    }

    // Get total count
    const totalResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM user_following_clubs WHERE club_id = ?'
    ).bind(id).first();
    const total = (totalResult as any)?.count || 0;

    // Get followers with pagination
    const { results } = await env.DB.prepare(`
      SELECT u.uid, u.display_name, u.photo_url, u.leo_id
      FROM user_following_clubs ufc
      JOIN users u ON ufc.user_id = u.uid
      WHERE ufc.club_id = ?
      ORDER BY ufc.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(id, limitNum, offsetNum).all();

    // Check follow status for each follower
    const followers = await Promise.all(results.map(async (follower: any) => {
      const isFollowing = await isUserFollowingUser(env.DB, currentUser.sub, follower.uid);
      const isMutualFollow = isFollowing && await isUserFollowingUser(env.DB, follower.uid, currentUser.sub);

      return {
        uid: follower.uid,
        displayName: follower.display_name,
        photoURL: follower.photo_url,
        leoId: follower.leo_id,
        isFollowing,
        isMutualFollow
      };
    }));

    return {
      followers,
      total,
      hasMore: offsetNum + limitNum < total
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Club Members
clubsRouter.get('/clubs/:id/members', withAuth, async (request: IRequest, env: Env) => {
  const { id } = request.params;
  const { limit, offset } = request.query;
  const currentUser = request.user;

  const limitNum = parseInt(limit as string) || 50;
  const offsetNum = parseInt(offset as string) || 0;

  try {
    // Check if club exists
    const club = await env.DB.prepare('SELECT id FROM clubs WHERE id = ?').bind(id).first();
    if (!club) {
      return error(404, 'Club not found');
    }

    // Get total count
    const totalResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM users WHERE assigned_club_id = ?'
    ).bind(id).first();
    const total = (totalResult as any)?.count || 0;

    // Get members with pagination
    const { results } = await env.DB.prepare(`
      SELECT uid, display_name, photo_url, leo_id
      FROM users
      WHERE assigned_club_id = ?
      ORDER BY display_name ASC
      LIMIT ? OFFSET ?
    `).bind(id, limitNum, offsetNum).all();

    // Check follow status for each member
    const members = await Promise.all(results.map(async (member: any) => {
      const isFollowing = await isUserFollowingUser(env.DB, currentUser.sub, member.uid);
      const isMutualFollow = isFollowing && await isUserFollowingUser(env.DB, member.uid, currentUser.sub);

      return {
        uid: member.uid,
        displayName: member.display_name,
        photoURL: member.photo_url,
        leoId: member.leo_id,
        isFollowing,
        isMutualFollow
      };
    }));

    return {
      members,
      total,
      hasMore: offsetNum + limitNum < total
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});
