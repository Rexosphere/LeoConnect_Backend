import { Router, IRequest } from 'itty-router';
import { json } from '../utils/http';
import { Env } from '../index';
import { withAuth } from '../middleware/auth';
import {
  mapToUserProfile,
  mapToPost,
  UserProfile,
  Post
} from '../models';
import {
  getUserCounts,
  getClubCounts,
  isUserFollowingUser,
  isUserFollowingClub
} from '../helpers';
import { notifyNewFollow } from '../notifications';

export const usersRouter = Router();

// Protected: Complete Quick Start (First-time user onboarding)
usersRouter.post('/users/me/quick-start', withAuth, async (request, env) => {
  const user = request.user;
  const body = await request.json() as any;

  try {
    // Validate club exists if provided
    if (body.assignedClubId) {
      const club = await env.DB.prepare('SELECT id FROM clubs WHERE id = ?').bind(body.assignedClubId).first();
      if (!club) {
        return json(400, { status: 400, error: 'Invalid club ID' });
      }
    }

    const updates: string[] = ['onboarding_completed = ?'];
    const params: any[] = [true];

    if (body.leoId !== undefined) {
      updates.push('leo_id = ?');
      params.push(body.leoId || null);
    }

    if (body.assignedClubId !== undefined) {
      updates.push('assigned_club_id = ?');
      params.push(body.assignedClubId || null);
    }

    params.push(user.sub); // For WHERE clause

    await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE uid = ?`).bind(...params).run();

    // If club is assigned, automatically follow it
    if (body.assignedClubId) {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO user_following_clubs (user_id, club_id)
        VALUES (?, ?)
      `).bind(user.sub, body.assignedClubId).run();
    }

    // Return updated profile
    const updatedUser = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(user.sub).first();
    if (!updatedUser) {
      return json(404, { status: 404, error: 'User not found' });
    }

    const followingClubsResult = await env.DB.prepare('SELECT club_id FROM user_following_clubs WHERE user_id = ?').bind(user.sub).all();
    const followingClubs = followingClubsResult.results.map((r: any) => r.club_id);
    const counts = await getUserCounts(env.DB, user.sub);

    const userData = {
      uid: updatedUser.uid,
      email: updatedUser.email,
      displayName: updatedUser.display_name,
      photoURL: updatedUser.photo_url,
      leoId: updatedUser.leo_id,
      bio: updatedUser.bio,
      isWebmaster: updatedUser.is_webmaster === 1,
      isVerified: updatedUser.is_verified === 1,
      assignedClubId: updatedUser.assigned_club_id,
      followingClubs: followingClubs,
      onboardingCompleted: updatedUser.onboarding_completed === 1,
      publicKey: updatedUser.public_key,
      ...counts
    };

    return mapToUserProfile(userData, user.sub);
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Get Current User Profile
usersRouter.get('/users/me', withAuth, async (request, env) => {
  const user = request.user;
  const { uid } = request.query;

  const targetUid = (uid as string) || user.sub;

  try {
    const userDoc = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(targetUid).first();
    if (!userDoc) {
      return json(404, { status: 404, error: 'User not found' });
    }

    const followingClubsResult = await env.DB.prepare('SELECT club_id FROM user_following_clubs WHERE user_id = ?').bind(targetUid).all();
    const followingClubs = followingClubsResult.results.map((r: any) => r.club_id);

    // Compute counts from relationships
    const counts = await getUserCounts(env.DB, targetUid);

    const userData = {
      uid: userDoc.uid,
      email: userDoc.email,
      displayName: userDoc.display_name,
      photoURL: userDoc.photo_url,
      leoId: userDoc.leo_id,
      bio: userDoc.bio,
      isWebmaster: userDoc.is_webmaster === 1,
      isVerified: userDoc.is_verified === 1,
      assignedClubId: userDoc.assigned_club_id,
      followingClubs: followingClubs,
      onboardingCompleted: userDoc.onboarding_completed === 1,
      publicKey: userDoc.public_key,
      ...counts
    };

    return mapToUserProfile(userData, targetUid);
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Update User Profile
usersRouter.patch('/users/me', withAuth, async (request, env) => {
  const user = request.user;
  const body = await request.json() as any;

  try {
    const updates: string[] = [];
    const params: any[] = [];

    // Handle display name
    if (body.displayName !== undefined) {
      updates.push('display_name = ?');
      params.push(body.displayName);
    }

    // Handle profile photo upload
    if (body.photoBytes) {
      try {
        const base64Data = body.photoBytes;
        const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Validate image size (max 5MB for profile photos)
        if (imageBuffer.length > 5 * 1024 * 1024) {
          return json(400, { status: 400, error: 'Profile photo must be less than 5MB' });
        }

        // Upload to Discord
        const formData = new FormData();
        const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
        formData.append('file', blob, 'profile.jpg');

        const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          body: formData,
        });

        if (!discordResponse.ok) {
          return json(500, { status: 500, error: 'Failed to upload profile photo' });
        }

        const discordData: any = await discordResponse.json();
        const photoUrl = discordData.attachments[0].url;

        updates.push('photo_url = ?');
        params.push(photoUrl);
      } catch (uploadError: any) {
        console.error('Photo upload error:', uploadError);
        return json(500, { status: 500, error: 'Failed to process profile photo' });
      }
    }

    if (body.leoId !== undefined) {
      updates.push('leo_id = ?');
      params.push(body.leoId);
    }
    if (body.assignedClubId !== undefined) {
      updates.push('assigned_club_id = ?');
      params.push(body.assignedClubId);
    }
    if (body.bio !== undefined) {
      updates.push('bio = ?');
      params.push(body.bio);
    }

    if (updates.length === 0) {
      return json(400, { status: 400, error: 'No valid fields to update' });
    }

    params.push(user.sub); // For WHERE clause

    await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE uid = ?`).bind(...params).run();

    // Return updated profile
    const updatedUser = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(user.sub).first();
    if (!updatedUser) {
      return json(404, { status: 404, error: 'User not found' });
    }

    // Fetch following clubs (unchanged)
    const followingClubsResult = await env.DB.prepare('SELECT club_id FROM user_following_clubs WHERE user_id = ?').bind(user.sub).all();
    const followingClubs = followingClubsResult.results.map((r: any) => r.club_id);

    // Compute counts from relationships
    const counts = await getUserCounts(env.DB, user.sub);

    const userData = {
      uid: updatedUser.uid,
      email: updatedUser.email,
      displayName: updatedUser.display_name,
      photoURL: updatedUser.photo_url,
      leoId: updatedUser.leo_id,
      bio: updatedUser.bio,
      isWebmaster: updatedUser.is_webmaster === 1,
      isVerified: updatedUser.is_verified === 1,
      assignedClubId: updatedUser.assigned_club_id,
      followingClubs: followingClubs,
      onboardingCompleted: updatedUser.onboarding_completed === 1,
      publicKey: updatedUser.public_key,
      ...counts
    };

    return mapToUserProfile(userData, user.sub);
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Update User's Public Key for E2E Encryption
usersRouter.put('/users/me/public-key', withAuth, async (request, env) => {
  const user = request.user;
  const body = await request.json() as any;

  try {
    if (!body.publicKey || typeof body.publicKey !== 'string') {
      return json(400, { status: 400, error: 'Public key is required' });
    }

    // Validate public key format (basic check for PEM format)
    if (!body.publicKey.includes('BEGIN PUBLIC KEY') || !body.publicKey.includes('END PUBLIC KEY')) {
      return json(400, { status: 400, error: 'Invalid public key format. Expected PEM format.' });
    }

    // Check if user already has a public key
    const existingUser = await env.DB.prepare('SELECT public_key FROM users WHERE uid = ?').bind(user.sub).first();
    if (existingUser && existingUser.public_key && !body.force) {
      return json(409, {
        status: 409,
        error: 'Public key already exists',
        message: 'A public key already exists for this user. Set force=true to overwrite.',
        hasExistingKey: true
      });
    }

    // Update public key
    await env.DB.prepare('UPDATE users SET public_key = ? WHERE uid = ?')
      .bind(body.publicKey, user.sub)
      .run();

    // Return updated profile
    const updatedUser = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(user.sub).first();
    if (!updatedUser) {
      return json(404, { status: 404, error: 'User not found' });
    }

    const followingClubsResult = await env.DB.prepare('SELECT club_id FROM user_following_clubs WHERE user_id = ?').bind(user.sub).all();
    const followingClubs = followingClubsResult.results.map((r: any) => r.club_id);
    const counts = await getUserCounts(env.DB, user.sub);

    const userData = {
      uid: updatedUser.uid,
      email: updatedUser.email,
      displayName: updatedUser.display_name,
      photoURL: updatedUser.photo_url,
      leoId: updatedUser.leo_id,
      bio: updatedUser.bio,
      isWebmaster: updatedUser.is_webmaster === 1,
      isVerified: updatedUser.is_verified === 1,
      assignedClubId: updatedUser.assigned_club_id,
      followingClubs: followingClubs,
      onboardingCompleted: updatedUser.onboarding_completed === 1,
      publicKey: updatedUser.public_key,
      ...counts
    };

    return mapToUserProfile(userData, user.sub);
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Get Public User Profile
usersRouter.get('/users/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const currentUser = request.user;

  try {
    const user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(id).first();
    if (!user) {
      return json(404, { status: 404, error: 'User not found' });
    }

    // Fetch following clubs
    const followingClubsResult = await env.DB.prepare('SELECT club_id FROM user_following_clubs WHERE user_id = ?').bind(id).all();
    const followingClubs = followingClubsResult.results.map((r: any) => r.club_id);

    // Compute counts from relationships
    const counts = await getUserCounts(env.DB, id);

    // Check if current user is following this user
    const isFollowing = await isUserFollowingUser(env.DB, currentUser.sub, id);

    // Check if it's a mutual follow
    const isMutualFollow = isFollowing && await isUserFollowingUser(env.DB, id, currentUser.sub);

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
      publicKey: user.public_key,
      ...counts
    };

    const userProfile = mapToUserProfile(userData, user.uid);
    userProfile.isFollowing = isFollowing;
    userProfile.isMutualFollow = isMutualFollow;

    return userProfile;
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Public: Get Posts by User
usersRouter.get('/users/:id/posts', async (request, env) => {
  const { id } = request.params;

  try {
    const { results } = await env.DB.prepare(`
        SELECT p.*, u.display_name as author_name, u.photo_url as author_logo, c.name as club_name
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.uid
        LEFT JOIN clubs c ON p.club_id = c.id
        WHERE p.author_id = ?
        ORDER BY p.created_at DESC
    `).bind(id).all();

    const posts = await Promise.all(results.map(async (p: any) => {
      let isLiked = false;
      // TODO: Check likes if auth token present

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
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Follow User
usersRouter.post('/users/:id/follow', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  if (id === user.sub) {
    return json(400, { status: 400, error: 'Cannot follow yourself' });
  }

  try {
    // Check if target user exists
    const targetUser = await env.DB.prepare('SELECT uid FROM users WHERE uid = ?').bind(id).first();
    if (!targetUser) {
      return json(404, { status: 404, error: 'User not found' });
    }

    // Check if already following
    const existing = await env.DB.prepare(
      'SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ?'
    ).bind(user.sub, id).first();

    if (existing) {
      return json(400, { status: 400, error: 'Already following this user' });
    }

    // Create follow relationship
    await env.DB.prepare(
      'INSERT INTO user_follows (follower_id, following_id) VALUES (?, ?)'
    ).bind(user.sub, id).run();

    // Send notification to the followed user
    const followerName = user.name || user.email || 'Someone';
    await notifyNewFollow(env.DB, id, followerName, user.sub, env).catch(err => {
      console.error('Failed to send follow notification:', err);
    });

    // Get updated counts
    const counts = await getUserCounts(env.DB, id);

    return {
      isFollowing: true,
      followersCount: counts.followersCount
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});


// Protected: Unfollow User
usersRouter.delete('/users/:id/follow', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Delete follow relationship
    const result = await env.DB.prepare(
      'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?'
    ).bind(user.sub, id).run();

    if (result.meta.changes === 0) {
      return json(404, { status: 404, error: 'Not following this user' });
    }

    // Get updated counts
    const counts = await getUserCounts(env.DB, id);

    return {
      isFollowing: false,
      followersCount: counts.followersCount
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Get User Followers
usersRouter.get('/users/:id/followers', withAuth, async (request, env) => {
  const { id } = request.params;
  const { limit, offset } = request.query;
  const currentUser = request.user;

  const limitNum = parseInt(limit as string) || 50;
  const offsetNum = parseInt(offset as string) || 0;

  try {
    // Check if user exists
    const user = await env.DB.prepare('SELECT uid FROM users WHERE uid = ?').bind(id).first();
    if (!user) {
      return json(404, { status: 404, error: 'User not found' });
    }

    // Get total count
    const totalResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?'
    ).bind(id).first();
    const total = (totalResult as any)?.count || 0;

    // Get followers with pagination
    const { results } = await env.DB.prepare(`
      SELECT u.uid, u.display_name, u.photo_url, u.leo_id
      FROM user_follows uf
      JOIN users u ON uf.follower_id = u.uid
      WHERE uf.following_id = ?
      ORDER BY uf.created_at DESC
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
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Get User Following
usersRouter.get('/users/:id/following', withAuth, async (request, env) => {
  const { id } = request.params;
  const { limit, offset } = request.query;
  const currentUser = request.user;

  const limitNum = parseInt(limit as string) || 50;
  const offsetNum = parseInt(offset as string) || 0;

  try {
    // Check if user exists
    const user = await env.DB.prepare('SELECT uid FROM users WHERE uid = ?').bind(id).first();
    if (!user) {
      return json(404, { status: 404, error: 'User not found' });
    }

    // Get total count
    const totalResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?'
    ).bind(id).first();
    const total = (totalResult as any)?.count || 0;

    // Get following with pagination
    const { results } = await env.DB.prepare(`
      SELECT u.uid, u.display_name, u.photo_url, u.leo_id
      FROM user_follows uf
      JOIN users u ON uf.following_id = u.uid
      WHERE uf.follower_id = ?
      ORDER BY uf.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(id, limitNum, offsetNum).all();

    // Check follow status for each user being followed
    const following = await Promise.all(results.map(async (followedUser: any) => {
      const isFollowing = await isUserFollowingUser(env.DB, currentUser.sub, followedUser.uid);
      const isMutualFollow = isFollowing && await isUserFollowingUser(env.DB, followedUser.uid, currentUser.sub);

      return {
        uid: followedUser.uid,
        displayName: followedUser.display_name,
        photoURL: followedUser.photo_url,
        leoId: followedUser.leo_id,
        isFollowing,
        isMutualFollow
      };
    }));

    return {
      following,
      total,
      hasMore: offsetNum + limitNum < total
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Get User Following Clubs
usersRouter.get('/users/:id/following-clubs', withAuth, async (request, env) => {
  const { id } = request.params;
  const { limit, offset } = request.query;
  const currentUser = request.user;

  const limitNum = parseInt(limit as string) || 50;
  const offsetNum = parseInt(offset as string) || 0;

  try {
    // Check if user exists
    const user = await env.DB.prepare('SELECT uid FROM users WHERE uid = ?').bind(id).first();
    if (!user) {
      return json(404, { status: 404, error: 'User not found' });
    }

    // Get total count
    const totalResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM user_following_clubs WHERE user_id = ?'
    ).bind(id).first();
    const total = (totalResult as any)?.count || 0;

    // Get following clubs with pagination
    const { results } = await env.DB.prepare(`
      SELECT c.*
      FROM user_following_clubs ufc
      JOIN clubs c ON ufc.club_id = c.id
      WHERE ufc.user_id = ?
      ORDER BY ufc.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(id, limitNum, offsetNum).all();

    // Map clubs with counts
    const clubs = await Promise.all(results.map(async (club: any) => {
      const counts = await getClubCounts(env.DB, club.id);
      const isFollowing = await isUserFollowingClub(env.DB, currentUser.sub, club.id);

      return {
        clubId: club.id,
        name: club.name,
        district: club.district,
        districtId: club.district_id,
        description: club.description,
        logoUrl: club.logo_url,
        coverImageUrl: club.cover_image_url,
        isOfficial: club.is_official === 1,
        address: club.address,
        email: club.email,
        phone: club.phone,
        socialLinks: {
          facebook: club.facebook_url,
          instagram: club.instagram_url,
          twitter: club.twitter_url
        },
        ...counts,
        isFollowing
      };
    }));

    return {
      clubs,
      total,
      hasMore: offsetNum + limitNum < total
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});
