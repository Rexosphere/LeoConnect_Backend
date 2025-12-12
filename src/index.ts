import { AutoRouter, IRequest, error, cors } from 'itty-router';
import { verifyFirebaseToken } from './auth';
import {
  mapToUserProfile,
  mapToClub,
  mapToPost,
  mapToComment,
  mapToMessage,
  UserProfile,
  Club,
  Post,
  Comment,
  Message
} from './models';
import {
  getUserCounts,
  getClubCounts,
  getPostCounts,
  isUserFollowingUser,
  isUserFollowingClub
} from './helpers';
import {
  notifyNewMessage,
  notifyNewFollow,
  notifyNewPostFromFollowing,
  notifyNewLike,
  notifyNewComment
} from './notifications';

// Define Env interface for Cloudflare Bindings
export interface Env {
  // Add bindings here (e.g., KV, D1, Secrets)
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  DISCORD_WEBHOOK_URL: string;
  DB: D1Database;
}

const { preflight, corsify } = cors();

// Type alias for route handlers to avoid implicit any errors
type RouteHandler = (request: IRequest, env: Env) => Response | Promise<Response> | object | Promise<object>;

const router = AutoRouter({
  before: [preflight],
  finally: [corsify],
});

// Middleware to authenticate requests
const withAuth = async (request: IRequest, env: Env) => {
  const user = await verifyFirebaseToken(request, env);
  if (!user) {
    return error(401, 'Unauthorized');
  }
  request.user = user;
};

// --- Routes ---

// Public: Health check
router.get('/', () => ({ message: 'LeoConnect Backend is running with D1!' }));

// Public: Auth with Google/Firebase
router.post('/auth/google', async (request, env) => {
  const token = request.headers.get('Authorization')?.split(' ')[1];
  if (!token) return error(400, 'Missing token');

  const payload = await verifyFirebaseToken(request, env);

  if (!payload || !payload.sub) {
    return error(401, 'Invalid token');
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
    assignedClubId: user.assigned_club_id,
    followingClubs: followingClubs,
    onboardingCompleted: user.onboarding_completed === 1,
    ...counts
  };

  return mapToUserProfile(userData, uid);
});

// Protected: Complete Quick Start (First-time user onboarding)
router.post('/users/me/quick-start', withAuth, async (request, env) => {
  const user = request.user;
  const body = await request.json() as any;

  try {
    // Validate club exists if provided
    if (body.assignedClubId) {
      const club = await env.DB.prepare('SELECT id FROM clubs WHERE id = ?').bind(body.assignedClubId).first();
      if (!club) {
        return error(400, 'Invalid club ID');
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
      return error(404, 'User not found');
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
      assignedClubId: updatedUser.assigned_club_id,
      followingClubs: followingClubs,
      onboardingCompleted: updatedUser.onboarding_completed === 1,
      ...counts
    };

    return mapToUserProfile(userData, user.sub);
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Home Feed (Posts from followed users and clubs)
router.get('/feed', withAuth, async (request, env) => {
  const { limit } = request.query;
  const user = request.user;

  try {
    // Fetch posts from followed users and clubs
    const { results } = await env.DB.prepare(`
        SELECT p.*, u.display_name as author_name, u.photo_url as author_logo, c.name as club_name
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.uid
        LEFT JOIN clubs c ON p.club_id = c.id
        WHERE p.author_id IN (
          SELECT following_id FROM user_follows WHERE follower_id = ?
        ) OR p.club_id IN (
          SELECT club_id FROM user_following_clubs WHERE user_id = ?
        ) OR p.author_id = ?
        ORDER BY p.created_at DESC LIMIT ?
    `).bind(user.sub, user.sub, user.sub, limit || 20).all();

    const posts = await Promise.all(results.map(async (p: any) => {
      // Check if liked by user
      const like = await env.DB.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').bind(p.id, user.sub).first();
      const isLiked = !!like;

      // Compute counts from relationships
      const counts = await getPostCounts(env.DB, p.id);

      const postData = {
        id: p.id,
        clubId: p.club_id,
        clubName: p.club_name,
        authorId: p.author_id,
        authorName: p.author_name,
        authorLogo: p.author_logo,
        content: p.content,
        imageUrl: p.image_url,
        images: p.image_url ? [p.image_url] : [],
        ...counts,
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

// Protected: Get Explore Feed (All posts from anyone)
router.get('/explore', withAuth, async (request, env) => {
  const { limit } = request.query;
  const user = request.user;

  try {
    // Fetch all posts
    const { results } = await env.DB.prepare(`
        SELECT p.*, u.display_name as author_name, u.photo_url as author_logo, c.name as club_name
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.uid
        LEFT JOIN clubs c ON p.club_id = c.id
        ORDER BY p.created_at DESC LIMIT ?
    `).bind(limit || 20).all();

    const posts = await Promise.all(results.map(async (p: any) => {
      // Check if liked by user
      const like = await env.DB.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').bind(p.id, user.sub).first();
      const isLiked = !!like;

      // Compute counts from relationships
      const counts = await getPostCounts(env.DB, p.id);

      const postData = {
        id: p.id,
        clubId: p.club_id,
        clubName: p.club_name,
        authorId: p.author_id,
        authorName: p.author_name,
        authorLogo: p.author_logo,
        content: p.content,
        imageUrl: p.image_url,
        images: p.image_url ? [p.image_url] : [],
        ...counts,
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

// Protected: Create Post
router.post('/posts', withAuth, async (request, env) => {
  const content = await request.json() as any;
  const user = request.user;

  try {
    // Input validation
    if (!content.content || typeof content.content !== 'string') {
      return error(400, 'Post content is required');
    }

    const trimmedContent = content.content.trim();
    if (trimmedContent.length === 0) {
      return error(400, 'Post content cannot be empty');
    }

    if (trimmedContent.length > 5000) {
      return error(400, 'Post content exceeds maximum length of 5000 characters');
    }

    // Validate image size if provided (max 10MB base64)
    if (content.imageBytes && content.imageBytes.length > 13333333) {
      return error(400, 'Image size exceeds maximum of 10MB');
    }

    let imageUrl = null;

    // Handle Image Upload to Discord
    if (content.imageBytes && content.imageBytes.length > 0) {
      try {
        // Decode base64 image data
        const imageData = Uint8Array.from(atob(content.imageBytes), c => c.charCodeAt(0));

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const extension = content.imageMimeType?.split('/')[1] || 'jpg';
        const filename = `post-${timestamp}-${randomId}.${extension}`;

        // Create FormData for Discord webhook
        const formData = new FormData();
        const blob = new Blob([imageData], { type: content.imageMimeType || 'image/jpeg' });
        formData.append('file', blob, filename);

        // Upload to Discord webhook
        const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          body: formData
        });

        if (!discordResponse.ok) {
          throw new Error(`Discord upload failed: ${discordResponse.statusText}`);
        }

        const discordJson = await discordResponse.json() as any;
        const attachment = discordJson.attachments?.[0];

        if (!attachment?.url) {
          throw new Error('No attachment URL in Discord response');
        }

        // Store the Discord CDN URL directly in database
        imageUrl = attachment.url;
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        // Continue without image if upload fails
      }
    }

    let clubId = content.clubId;
    if (!clubId) {
      // Assign random club if not provided
      const randomClub = await env.DB.prepare('SELECT id FROM clubs ORDER BY RANDOM() LIMIT 1').first();
      if (randomClub) {
        clubId = randomClub.id;
      } else {
        // Fallback if no clubs exist (shouldn't happen in real app but good for safety)
        return error(400, 'No clubs available to assign post to');
      }
    }

    const postId = `post-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
        INSERT INTO posts (id, club_id, author_id, content, image_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      postId,
      clubId,
      user.sub,
      content.content,
      imageUrl,
      now,
      now
    ).run();

    // Return full Post object with joins
    const newPost = await env.DB.prepare(`
        SELECT p.*, u.display_name as author_name, u.photo_url as author_logo, c.name as club_name
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.uid
        LEFT JOIN clubs c ON p.club_id = c.id
        WHERE p.id = ?
    `).bind(postId).first();

    // Notify all followers about the new post (async, don't wait)
    const authorName = user.name || user.email || 'Someone';
    const postPreview = content.content.substring(0, 100);

    // Get all followers and send notifications
    env.DB.prepare('SELECT follower_id FROM user_follows WHERE following_id = ?')
      .bind(user.sub)
      .all()
      .then(({ results }) => {
        results.forEach((follower: any) => {
          notifyNewPostFromFollowing(
            env.DB,
            follower.follower_id,
            authorName,
            postId,
            postPreview,
            env
          ).catch(err => console.error('Failed to send post notification:', err));
        });
      })
      .catch(err => console.error('Failed to fetch followers for notification:', err));

    // Map manually since we know structure
    if (!newPost) {
      return error(500, 'Failed to create post');
    }

    return {
      postId: newPost.id,
      clubId: newPost.club_id,
      clubName: newPost.club_name,
      authorId: newPost.author_id,
      authorName: newPost.author_name,
      authorLogo: newPost.author_logo,
      content: newPost.content,
      imageUrl: newPost.image_url,
      images: newPost.image_url ? [newPost.image_url] : [],
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isLikedByUser: false,
      isPinned: false,
      createdAt: newPost.created_at,
      updatedAt: newPost.updated_at
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});


// Protected: Like Post
router.post('/posts/:id/like', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Check if post exists
    const post = await env.DB.prepare('SELECT id FROM posts WHERE id = ?').bind(id).first();
    if (!post) {
      return error(404, 'Post not found');
    }

    // Check if user already liked the post
    const existingLike = await env.DB.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').bind(id, user.sub).first();

    let isLiked = false;

    if (existingLike) {
      // Unlike
      await env.DB.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').bind(id, user.sub).run();
      isLiked = false;
    } else {
      // Like
      await env.DB.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').bind(id, user.sub).run();
      isLiked = true;
    }

    // Compute current likes count
    const counts = await getPostCounts(env.DB, id);

    return {
      message: isLiked ? `Liked post ${id}` : `Unliked post ${id}`,
      likesCount: counts.likesCount,
      isLikedByUser: isLiked
    };

  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Comments for Post
router.get('/posts/:id/comments', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    const { results } = await env.DB.prepare(`
        SELECT c.*, u.display_name as author_name, u.photo_url as author_photo_url
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.uid
        WHERE c.post_id = ? 
        ORDER BY c.created_at DESC
    `).bind(id).all();

    // Map comments with like status
    const comments = await Promise.all(results.map(async (c: any) => {
      // Check if current user liked this comment
      const likeCheck = await env.DB.prepare(
        'SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_id = ?'
      ).bind(c.id, user.sub).first();

      return {
        commentId: c.id,
        postId: c.post_id,
        userId: c.user_id,
        authorName: c.author_name,
        authorPhotoUrl: c.author_photo_url,
        content: c.content,
        createdAt: c.created_at,
        likesCount: c.likes_count || 0,
        isLikedByUser: !!likeCheck
      };
    }));

    return {
      comments,
      total: results.length,
      hasMore: false
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Add Comment to Post
router.post('/posts/:id/comments', withAuth, async (request, env) => {
  const { id } = request.params;
  const content = await request.json() as any;
  const user = request.user;

  if (!content.content || content.content.trim() === "") {
    return error(400, "Comment content cannot be empty");
  }

  if (content.content.length > 2000) {
    return error(400, "Comment exceeds maximum length of 2000 characters");
  }

  try {
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
        INSERT INTO comments (id, post_id, user_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).bind(commentId, id, user.sub, content.content, now).run();

    return {
      comment: {
        commentId: commentId,
        postId: id,
        userId: user.sub,
        authorName: user.name || user.email,
        authorPhotoUrl: user.picture || '',
        content: content.content,
        createdAt: now,
        likesCount: 0,
        isLikedByUser: false
      }
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Delete Comment
router.delete('/comments/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    const comment = await env.DB.prepare('SELECT * FROM comments WHERE id = ?').bind(id).first();
    if (!comment) return error(404, 'Comment not found');

    // Check ownership
    if (comment.user_id !== user.sub) {
      return error(403, 'You can only delete your own comments');
    }

    await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();

    return { success: true };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Like/Unlike Comment
router.post('/comments/:id/like', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Check if comment exists
    const comment = await env.DB.prepare('SELECT id, likes_count FROM comments WHERE id = ?').bind(id).first();
    if (!comment) {
      return error(404, 'Comment not found');
    }

    // Check if already liked
    const existingLike = await env.DB.prepare(
      'SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_id = ?'
    ).bind(id, user.sub).first();

    let isLiked = false;
    let newLikesCount = comment.likes_count || 0;

    if (existingLike) {
      // Unlike - remove like
      await env.DB.prepare('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?').bind(id, user.sub).run();
      newLikesCount = Math.max(0, newLikesCount - 1);
      isLiked = false;
    } else {
      // Like - add like
      await env.DB.prepare('INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)').bind(id, user.sub).run();
      newLikesCount += 1;
      isLiked = true;
    }

    // Update likes count on comment
    await env.DB.prepare('UPDATE comments SET likes_count = ? WHERE id = ?').bind(newLikesCount, id).run();

    return {
      isLikedByUser: isLiked,
      likesCount: newLikesCount
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Single Post
router.get('/posts/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    const post = await env.DB.prepare(`
        SELECT p.*, u.display_name as author_name, u.photo_url as author_logo, c.name as club_name
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.uid
        LEFT JOIN clubs c ON p.club_id = c.id
        WHERE p.id = ?
    `).bind(id).first();
    if (!post) return error(404, 'Post not found');

    // Fetch club details
    let club = null;
    if (post.club_id) {
      const clubDoc = await env.DB.prepare('SELECT * FROM clubs WHERE id = ?').bind(post.club_id).first();
      if (clubDoc) {
        club = mapToClub({
          id: clubDoc.id,
          name: clubDoc.name,
          district: clubDoc.district,
          districtId: clubDoc.district_id,
          description: clubDoc.description,
          logoUrl: clubDoc.logo_url,
          coverImageUrl: clubDoc.cover_image_url,
          membersCount: clubDoc.members_count,
          followersCount: clubDoc.followers_count,
          postsCount: clubDoc.posts_count,
          isOfficial: clubDoc.is_official === 1,
          address: clubDoc.address,
          email: clubDoc.email,
          phone: clubDoc.phone,
          socialLinks: {
            facebook: clubDoc.facebook_url,
            instagram: clubDoc.instagram_url,
            twitter: clubDoc.twitter_url
          }
        }, clubDoc.id);
      }
    }

    // Check if liked by user
    const like = await env.DB.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').bind(post.id, user.sub).first();
    const isLiked = !!like;

    const postData = {
      id: post.id,
      clubId: post.club_id,
      clubName: post.club_name,
      authorId: post.author_id,
      authorName: post.author_name,
      authorLogo: post.author_logo,
      content: post.content,
      imageUrl: post.image_url,
      images: post.image_url ? [post.image_url] : [],
      likesCount: post.likes_count,
      commentsCount: post.comments_count,
      sharesCount: post.shares_count,
      isPinned: post.is_pinned === 1,
      timestamp: post.created_at,
      updatedAt: post.updated_at
    };

    const mappedPost = mapToPost(postData, post.id);
    mappedPost.isLikedByUser = isLiked;

    // Check if user is following this club
    let isFollowingClub = false;
    if (post.club_id) {
      isFollowingClub = await isUserFollowingClub(env.DB, user.sub, post.club_id);
    }

    return {
      post: mappedPost,
      club,
      isFollowingClub
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Share Post
router.post('/posts/:id/share', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Check if post exists
    const post = await env.DB.prepare('SELECT id, shares_count FROM posts WHERE id = ?').bind(id).first();
    if (!post) {
      return error(404, 'Post not found');
    }

    // Check if already shared by this user
    const existingShare = await env.DB.prepare(
      'SELECT id FROM post_shares WHERE post_id = ? AND user_id = ?'
    ).bind(id, user.sub).first();

    if (existingShare) {
      // Already shared, return current count
      return {
        shareId: existingShare.id,
        sharesCount: post.shares_count || 0,
        alreadyShared: true
      };
    }

    // Create share record
    const shareId = `share-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    await env.DB.prepare(
      'INSERT INTO post_shares (id, post_id, user_id) VALUES (?, ?, ?)'
    ).bind(shareId, id, user.sub).run();

    // Update shares count on post
    const newSharesCount = (post.shares_count || 0) + 1;
    await env.DB.prepare(
      'UPDATE posts SET shares_count = ? WHERE id = ?'
    ).bind(newSharesCount, id).run();

    return {
      shareId,
      sharesCount: newSharesCount,
      alreadyShared: false
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Delete Post
router.delete('/posts/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Get the post to verify ownership
    const post = await env.DB.prepare('SELECT author_id FROM posts WHERE id = ?').bind(id).first();

    if (!post) {
      return error(404, 'Post not found');
    }

    // Check if user is the author or a webmaster (admin)
    const currentUser = await env.DB.prepare('SELECT is_webmaster FROM users WHERE uid = ?').bind(user.sub).first();
    const isWebmaster = currentUser && currentUser.is_webmaster === 1;

    if (post.author_id !== user.sub && !isWebmaster) {
      return error(403, 'You can only delete your own posts');
    }

    // Delete related data first (comments, likes, images)
    await env.DB.prepare('DELETE FROM comments WHERE post_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM post_likes WHERE post_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM post_images WHERE post_id = ?').bind(id).run();

    // Delete the post
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();

    return { success: true, message: 'Post deleted successfully' };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Follow User
router.post('/users/:id/follow', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  if (id === user.sub) {
    return error(400, 'Cannot follow yourself');
  }

  try {
    // Check if target user exists
    const targetUser = await env.DB.prepare('SELECT uid FROM users WHERE uid = ?').bind(id).first();
    if (!targetUser) {
      return error(404, 'User not found');
    }

    // Check if already following
    const existing = await env.DB.prepare(
      'SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ?'
    ).bind(user.sub, id).first();

    if (existing) {
      return error(400, 'Already following this user');
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
    return error(500, e.message);
  }
});


// Protected: Unfollow User
router.delete('/users/:id/follow', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Delete follow relationship
    const result = await env.DB.prepare(
      'DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?'
    ).bind(user.sub, id).run();

    if (result.meta.changes === 0) {
      return error(404, 'Not following this user');
    }

    // Get updated counts
    const counts = await getUserCounts(env.DB, id);

    return {
      isFollowing: false,
      followersCount: counts.followersCount
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});


// Protected: Follow Club
router.post('/clubs/:id/follow', withAuth, async (request, env) => {
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

// Protected: Get User Followers
router.get('/users/:id/followers', withAuth, async (request, env) => {
  const { id } = request.params;
  const { limit, offset } = request.query;
  const currentUser = request.user;

  const limitNum = parseInt(limit as string) || 50;
  const offsetNum = parseInt(offset as string) || 0;

  try {
    // Check if user exists
    const user = await env.DB.prepare('SELECT uid FROM users WHERE uid = ?').bind(id).first();
    if (!user) {
      return error(404, 'User not found');
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
    return error(500, e.message);
  }
});

// Protected: Get User Following
router.get('/users/:id/following', withAuth, async (request, env) => {
  const { id } = request.params;
  const { limit, offset } = request.query;
  const currentUser = request.user;

  const limitNum = parseInt(limit as string) || 50;
  const offsetNum = parseInt(offset as string) || 0;

  try {
    // Check if user exists
    const user = await env.DB.prepare('SELECT uid FROM users WHERE uid = ?').bind(id).first();
    if (!user) {
      return error(404, 'User not found');
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
    return error(500, e.message);
  }
});

// Protected: Get Club Followers
router.get('/clubs/:id/followers', withAuth, async (request, env) => {
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
router.get('/clubs/:id/members', withAuth, async (request, env) => {
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

// Protected: Register FCM Token
router.post('/notifications/token', withAuth, async (request, env) => {
  const user = request.user;
  const body = await request.json() as any;

  if (!body.token) {
    return error(400, 'FCM token is required');
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
    return error(500, e.message);
  }
});

// Protected: Remove FCM Token
router.delete('/notifications/token', withAuth, async (request, env) => {
  const user = request.user;
  const body = await request.json() as any;

  if (!body.token) {
    return error(400, 'FCM token is required');
  }

  try {
    await env.DB.prepare(
      'DELETE FROM fcm_tokens WHERE user_id = ? AND token = ?'
    ).bind(user.sub, body.token).run();

    return { success: true, message: 'FCM token removed' };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Notifications
router.get('/notifications', withAuth, async (request, env) => {
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
    return error(500, e.message);
  }
});

// Protected: Mark Notification as Read
router.patch('/notifications/:id/read', withAuth, async (request, env) => {
  const user = request.user;
  const { id } = request.params;

  try {
    const notification = await env.DB.prepare(
      'SELECT user_id FROM notifications WHERE id = ?'
    ).bind(id).first();

    if (!notification) {
      return error(404, 'Notification not found');
    }

    if (notification.user_id !== user.sub) {
      return error(403, 'Not your notification');
    }

    await env.DB.prepare(
      'UPDATE notifications SET is_read = 1 WHERE id = ?'
    ).bind(id).run();

    return { success: true };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Mark All Notifications as Read
router.post('/notifications/read-all', withAuth, async (request, env) => {
  const user = request.user;

  try {
    await env.DB.prepare(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
    ).bind(user.sub).run();

    return { success: true };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Notification Preferences
router.get('/notifications/preferences', withAuth, async (request, env) => {
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
        return error(500, 'Failed to create notification preferences');
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
    return error(500, e.message);
  }
});

// Protected: Update Notification Preferences
router.patch('/notifications/preferences', withAuth, async (request, env) => {
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
      return error(400, 'No preferences to update');
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
    return error(500, e.message);
  }
});

// Public: Get Districts
router.get('/districts', async (request, env) => {
  try {
    const { results } = await env.DB.prepare('SELECT name FROM districts ORDER BY name').all();
    return results.map((d: any) => d.name);
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Public: Get Clubs by District
router.get('/clubs', async (request, env) => {
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
router.get('/clubs/:id/posts', async (request, env) => {
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

      const postData = {
        id: p.id,
        clubId: p.club_id,
        clubName: p.club_name,
        authorId: p.author_id,
        authorName: p.author_name,
        authorLogo: p.author_logo,
        content: p.content,
        imageUrl: p.image_url,
        images: p.image_url ? [p.image_url] : [],
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

// Protected: Get Public User Profile
router.get('/users/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const currentUser = request.user;

  try {
    const user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(id).first();
    if (!user) {
      return error(404, 'User not found');
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
      assignedClubId: user.assigned_club_id,
      followingClubs: followingClubs,
      onboardingCompleted: user.onboarding_completed === 1,
      ...counts
    };

    const userProfile = mapToUserProfile(userData, user.uid);
    userProfile.isFollowing = isFollowing;
    userProfile.isMutualFollow = isMutualFollow;

    return userProfile;
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Public: Search Autocomplete
router.get('/search/autocomplete', async (request, env) => {
  const { q } = request.query;

  if (!q || typeof q !== 'string' || q.length < 2) {
    return [];
  }

  const query = `%${q}%`;

  try {
    // Search Clubs
    const clubs = await env.DB.prepare('SELECT id, name FROM clubs WHERE name LIKE ? LIMIT 5').bind(query).all();

    // Search Districts
    const districts = await env.DB.prepare('SELECT name FROM districts WHERE name LIKE ? LIMIT 5').bind(query).all();

    // Search Posts (by content or author)
    const posts = await env.DB.prepare('SELECT id, content FROM posts WHERE content LIKE ? LIMIT 5').bind(query).all();

    return {
      clubs: clubs.results.map((c: any) => ({ id: c.id, name: c.name })),
      districts: districts.results.map((d: any) => d.name),
      posts: posts.results.map((p: any) => ({ id: p.id, title: p.content.substring(0, 50) + '...' }))
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Public: Search Users
router.get('/search/users', async (request, env) => {
  const { q } = request.query;

  if (!q || typeof q !== 'string' || q.length < 2) {
    return [];
  }

  const query = `%${q}%`;

  try {
    const { results } = await env.DB.prepare('SELECT uid, display_name, photo_url FROM users WHERE display_name LIKE ? LIMIT 10').bind(query).all();

    return results.map((u: any) => ({
      userId: u.uid,
      displayName: u.display_name,
      photoUrl: u.photo_url
    }));
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Public: Search Results
router.get('/search', async (request, env) => {
  const { q } = request.query;

  if (!q || typeof q !== 'string') {
    return error(400, 'Missing query parameter');
  }

  const query = `%${q}%`;

  try {
    // Search Clubs
    const clubsResults = await env.DB.prepare('SELECT * FROM clubs WHERE name LIKE ? OR description LIKE ? LIMIT 10').bind(query, query).all();
    const clubs = clubsResults.results.map((c: any) => mapToClub({
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

    // Search Districts
    const districtsResults = await env.DB.prepare('SELECT * FROM districts WHERE name LIKE ? LIMIT 10').bind(query).all();
    const districts = districtsResults.results.map((d: any) => ({
      name: d.name,
      totalClubs: d.total_clubs || 0, // Assuming column names
      totalMembers: d.total_members || 0
    }));

    // Search Posts
    const postsResults = await env.DB.prepare(`
        SELECT p.*, u.display_name as author_name, u.photo_url as author_logo, c.name as club_name
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.uid
        LEFT JOIN clubs c ON p.club_id = c.id
        WHERE p.content LIKE ? 
        ORDER BY p.created_at DESC LIMIT 20
    `).bind(query).all();
    const posts = await Promise.all(postsResults.results.map(async (p: any) => {
      const postData = {
        id: p.id,
        clubId: p.club_id,
        clubName: p.club_name,
        authorId: p.author_id,
        authorName: p.author_name,
        authorLogo: p.author_logo,
        content: p.content,
        imageUrl: p.image_url,
        images: p.image_url ? [p.image_url] : [],
        likesCount: p.likes_count,
        commentsCount: p.comments_count,
        sharesCount: p.shares_count,
        isPinned: p.is_pinned === 1,
        timestamp: p.created_at,
        updatedAt: p.updated_at
      };
      return mapToPost(postData, p.id);
    }));

    return {
      clubs,
      districts,
      posts
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Public: Get Posts by User
router.get('/users/:id/posts', async (request, env) => {
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

      const postData = {
        id: p.id,
        clubId: p.club_id,
        clubName: p.club_name,
        authorId: p.author_id,
        authorName: p.author_name,
        authorLogo: p.author_logo,
        content: p.content,
        imageUrl: p.image_url,
        images: p.image_url ? [p.image_url] : [],
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

// Protected: Get Current User Profile
router.get('/users/me', withAuth, async (request, env) => {
  const user = request.user;
  const { uid } = request.query;

  const targetUid = (uid as string) || user.sub;

  try {
    const userDoc = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(targetUid).first();
    if (!userDoc) {
      return error(404, 'User not found');
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
      assignedClubId: userDoc.assigned_club_id,
      followingClubs: followingClubs,
      onboardingCompleted: userDoc.onboarding_completed === 1,
      ...counts
    };

    return mapToUserProfile(userData, targetUid);
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Update User Profile
router.patch('/users/me', withAuth, async (request, env) => {
  const user = request.user;
  const body = await request.json() as any;

  try {
    const updates: string[] = [];
    const params: any[] = [];

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
      return error(400, 'No valid fields to update');
    }

    params.push(user.sub); // For WHERE clause

    await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE uid = ?`).bind(...params).run();

    // Return updated profile
    const updatedUser = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(user.sub).first();
    if (!updatedUser) {
      return error(404, 'User not found');
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
      assignedClubId: updatedUser.assigned_club_id,
      followingClubs: followingClubs,
      onboardingCompleted: updatedUser.onboarding_completed === 1,
      ...counts
    };

    return mapToUserProfile(userData, user.sub);
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Send Message
router.post('/messages', withAuth, async (request, env) => {
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
        VALUES (?, ?, ?, ?, ?)\n    `).bind(messageId, user.sub, body.receiverId, body.content, now).run();

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
router.get('/conversations', withAuth, async (request, env) => {
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
router.get('/messages/:userId', withAuth, async (request, env) => {
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
router.delete('/messages/:id', withAuth, async (request, env) => {
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
router.delete('/conversations/:userId', withAuth, async (request, env) => {
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

// ==================== ADMIN ROUTES ====================
// Admin authentication middleware - uses hardcoded API key
const ADMIN_API_KEY = 'leo-admin-secret-2024';

const withAdminAuth = (request: IRequest, env: Env) => {
  const apiKey = request.headers.get('X-Admin-Key');
  if (apiKey !== ADMIN_API_KEY) {
    return error(401, 'Invalid admin key');
  }
};

// Admin: Get dashboard statistics
router.get('/admin/stats', withAdminAuth, async (request, env) => {
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
router.get('/admin/users', withAdminAuth, async (request, env) => {
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

// Admin: Get all clubs
router.get('/admin/clubs', withAdminAuth, async (request, env) => {
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

// Admin: Get all districts with club counts
router.get('/admin/districts', withAdminAuth, async (request, env) => {
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

// Admin: Get all posts
router.get('/admin/posts', withAdminAuth, async (request, env) => {
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

// Admin: Get all messages
router.get('/admin/messages', withAdminAuth, async (request, env) => {
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

// Admin: Delete a user
router.delete('/admin/users/:id', withAdminAuth, async (request, env) => {
  const { id } = request.params;
  try {
    await env.DB.prepare('DELETE FROM users WHERE uid = ?').bind(id).run();
    return { success: true };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Admin: Delete a post
router.delete('/admin/posts/:id', withAdminAuth, async (request, env) => {
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

// Simple password hash verification (using SHA-256 for Cloudflare Workers compatibility)
async function verifyAdminPassword(password: string, hash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === hash;
}

// Admin Login - with SHA-256 password verification
router.post('/admin/login', async (request: IRequest, env: Env) => {
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

// Admin: Create User
router.post('/admin/users', withAdminAuth, async (request: IRequest, env: Env) => {
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

// Admin: Create Club
router.post('/admin/clubs', withAdminAuth, async (request: IRequest, env: Env) => {
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
router.put('/admin/clubs/:id', withAdminAuth, async (request: IRequest, env: Env) => {
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
router.delete('/admin/clubs/:id', withAdminAuth, async (request: IRequest, env: Env) => {
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

// Admin: Create District
router.post('/admin/districts', withAdminAuth, async (request: IRequest, env: Env) => {
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
router.delete('/admin/districts/:name', withAdminAuth, async (request: IRequest, env: Env) => {
  const { name } = request.params;

  try {
    await env.DB.prepare('DELETE FROM districts WHERE name = ?').bind(name).run();
    return { success: true };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// ==================== EVENT ENDPOINTS ====================

// Protected: Get All Events
router.get('/events', withAuth, async (request, env) => {
  const { limit, clubId } = request.query;
  const user = request.user;

  try {
    let query = `
      SELECT e.*, u.display_name as author_name, c.name as club_name
      FROM events e
      LEFT JOIN users u ON e.author_id = u.uid
      LEFT JOIN clubs c ON e.club_id = c.id
    `;
    const params: any[] = [];

    if (clubId) {
      query += ' WHERE e.club_id = ?';
      params.push(clubId);
    }

    query += ' ORDER BY e.event_date ASC LIMIT ?';
    params.push(limit || 20);

    const { results } = await env.DB.prepare(query).bind(...params).all();

    const events = await Promise.all(results.map(async (e: any) => {
      // Check if user has RSVP'd
      const rsvp = await env.DB.prepare('SELECT 1 FROM event_rsvps WHERE event_id = ? AND user_id = ?').bind(e.id, user.sub).first();
      const hasRSVPd = !!rsvp;

      // Get RSVP participants
      const rsvpResult = await env.DB.prepare(`
        SELECT u.uid, u.display_name, u.photo_url
        FROM event_rsvps er
        LEFT JOIN users u ON er.user_id = u.uid
        WHERE er.event_id = ?
      `).bind(e.id).all();

      return {
        eventId: e.id,
        clubId: e.club_id,
        clubName: e.club_name,
        authorId: e.author_id,
        authorName: e.author_name,
        name: e.name,
        description: e.description,
        eventDate: e.event_date,
        imageUrl: e.image_url,
        rsvpCount: e.rsvp_count || 0,
        hasRSVPd,
        rsvpParticipants: rsvpResult.results.map((r: any) => ({
          uid: r.uid,
          displayName: r.display_name,
          photoUrl: r.photo_url
        })),
        createdAt: e.created_at,
        updatedAt: e.updated_at
      };
    }));

    return events;
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Single Event
router.get('/events/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    const event = await env.DB.prepare(`
      SELECT e.*, u.display_name as author_name, c.name as club_name
      FROM events e
      LEFT JOIN users u ON e.author_id = u.uid
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = ?
    `).bind(id).first();

    if (!event) {
      return error(404, 'Event not found');
    }

    // Check if user has RSVP'd
    const rsvp = await env.DB.prepare('SELECT 1 FROM event_rsvps WHERE event_id = ? AND user_id = ?').bind(id, user.sub).first();
    const hasRSVPd = !!rsvp;

    // Get RSVP participants
    const rsvpResult = await env.DB.prepare(`
      SELECT u.uid, u.display_name, u.photo_url
      FROM event_rsvps er
      LEFT JOIN users u ON er.user_id = u.uid
      WHERE er.event_id = ?
    `).bind(id).all();

    return {
      eventId: event.id,
      clubId: event.club_id,
      clubName: event.club_name,
      authorId: event.author_id,
      authorName: event.author_name,
      name: event.name,
      description: event.description,
      eventDate: event.event_date,
      imageUrl: event.image_url,
      rsvpCount: event.rsvp_count || 0,
      hasRSVPd,
      rsvpParticipants: rsvpResult.results.map((r: any) => ({
        uid: r.uid,
        displayName: r.display_name,
        photoUrl: r.photo_url
      })),
      createdAt: event.created_at,
      updatedAt: event.updated_at
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Create Event
router.post('/events', withAuth, async (request, env) => {
  const content = await request.json() as any;
  const user = request.user;

  try {
    // Input validation
    if (!content.name || typeof content.name !== 'string') {
      return error(400, 'Event name is required');
    }

    if (!content.description || typeof content.description !== 'string') {
      return error(400, 'Event description is required');
    }

    if (!content.eventDate) {
      return error(400, 'Event date is required');
    }

    const trimmedName = content.name.trim();
    if (trimmedName.length === 0) {
      return error(400, 'Event name cannot be empty');
    }

    if (trimmedName.length > 200) {
      return error(400, 'Event name exceeds maximum length of 200 characters');
    }

    const trimmedDescription = content.description.trim();
    if (trimmedDescription.length === 0) {
      return error(400, 'Event description cannot be empty');
    }

    if (trimmedDescription.length > 5000) {
      return error(400, 'Event description exceeds maximum length of 5000 characters');
    }

    // Validate image size if provided (max 10MB base64)
    if (content.imageBytes && content.imageBytes.length > 13333333) {
      return error(400, 'Image size exceeds maximum of 10MB');
    }

    let imageUrl = null;

    // Handle Image Upload to Discord (same as post creation)
    if (content.imageBytes && content.imageBytes.length > 0) {
      try {
        // Decode base64 image data
        const imageData = Uint8Array.from(atob(content.imageBytes), c => c.charCodeAt(0));

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const extension = content.imageMimeType?.split('/')[1] || 'jpg';
        const filename = `event-${timestamp}-${randomId}.${extension}`;

        // Create FormData for Discord webhook
        const formData = new FormData();
        const blob = new Blob([imageData], { type: content.imageMimeType || 'image/jpeg' });
        formData.append('file', blob, filename);

        // Upload to Discord webhook
        const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          body: formData
        });

        if (!discordResponse.ok) {
          throw new Error(`Discord upload failed: ${discordResponse.statusText}`);
        }

        const discordJson = await discordResponse.json() as any;
        const attachment = discordJson.attachments?.[0];

        if (!attachment?.url) {
          throw new Error('No attachment URL in Discord response');
        }

        // Store the Discord CDN URL directly in database
        imageUrl = attachment.url;
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
        // Continue without image if upload fails
      }
    }

    let clubId = content.clubId;
    if (!clubId) {
      // Assign random club if not provided
      const randomClub = await env.DB.prepare('SELECT id FROM clubs ORDER BY RANDOM() LIMIT 1').first();
      if (randomClub) {
        clubId = randomClub.id;
      } else {
        return error(400, 'No clubs available to assign event to');
      }
    }

    const eventId = `event-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO events (id, club_id, author_id, name, description, event_date, image_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      eventId,
      clubId,
      user.sub,
      content.name,
      content.description,
      content.eventDate,
      imageUrl,
      now,
      now
    ).run();

    // Return full Event object with joins
    const newEvent = await env.DB.prepare(`
      SELECT e.*, u.display_name as author_name, c.name as club_name
      FROM events e
      LEFT JOIN users u ON e.author_id = u.uid
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = ?
    `).bind(eventId).first();

    if (!newEvent) {
      return error(500, 'Failed to create event');
    }

    return {
      eventId: newEvent.id,
      clubId: newEvent.club_id,
      clubName: newEvent.club_name,
      authorId: newEvent.author_id,
      authorName: newEvent.author_name,
      name: newEvent.name,
      description: newEvent.description,
      eventDate: newEvent.event_date,
      imageUrl: newEvent.image_url,
      rsvpCount: 0,
      hasRSVPd: false,
      rsvpParticipants: [],
      createdAt: newEvent.created_at,
      updatedAt: newEvent.updated_at
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Update Event
router.put('/events/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const content = await request.json() as any;
  const user = request.user;

  try {
    // Get the event to verify ownership
    const event = await env.DB.prepare('SELECT author_id FROM events WHERE id = ?').bind(id).first();

    if (!event) {
      return error(404, 'Event not found');
    }

    // Check if user is the author or a webmaster (admin)
    const currentUser = await env.DB.prepare('SELECT is_webmaster FROM users WHERE uid = ?').bind(user.sub).first();
    const isWebmaster = currentUser && currentUser.is_webmaster === 1;

    if (event.author_id !== user.sub && !isWebmaster) {
      return error(403, 'You can only update your own events');
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];

    if (content.name !== undefined) {
      if (content.name.trim().length === 0) {
        return error(400, 'Event name cannot be empty');
      }
      if (content.name.length > 200) {
        return error(400, 'Event name exceeds maximum length of 200 characters');
      }
      updates.push('name = ?');
      params.push(content.name);
    }

    if (content.description !== undefined) {
      if (content.description.trim().length === 0) {
        return error(400, 'Event description cannot be empty');
      }
      if (content.description.length > 5000) {
        return error(400, 'Event description exceeds maximum length of 5000 characters');
      }
      updates.push('description = ?');
      params.push(content.description);
    }

    if (content.eventDate !== undefined) {
      updates.push('event_date = ?');
      params.push(content.eventDate);
    }

    // Handle Image Upload if provided
    if (content.imageBytes && content.imageBytes.length > 0) {
      if (content.imageBytes.length > 13333333) {
        return error(400, 'Image size exceeds maximum of 10MB');
      }

      try {
        const imageData = Uint8Array.from(atob(content.imageBytes), c => c.charCodeAt(0));
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(7);
        const extension = content.imageMimeType?.split('/')[1] || 'jpg';
        const filename = `event-${timestamp}-${randomId}.${extension}`;

        const formData = new FormData();
        const blob = new Blob([imageData], { type: content.imageMimeType || 'image/jpeg' });
        formData.append('file', blob, filename);

        const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          body: formData
        });

        if (discordResponse.ok) {
          const discordJson = await discordResponse.json() as any;
          const attachment = discordJson.attachments?.[0];
          if (attachment?.url) {
            updates.push('image_url = ?');
            params.push(attachment.url);
          }
        }
      } catch (uploadError) {
        console.error('Image upload failed:', uploadError);
      }
    }

    if (updates.length === 0) {
      return error(400, 'No fields to update');
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    await env.DB.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();

    // Return updated event
    const updatedEvent = await env.DB.prepare(`
      SELECT e.*, u.display_name as author_name, c.name as club_name
      FROM events e
      LEFT JOIN users u ON e.author_id = u.uid
      LEFT JOIN clubs c ON e.club_id = c.id
      WHERE e.id = ?
    `).bind(id).first();

    if (!updatedEvent) {
      return error(500, 'Failed to fetch updated event');
    }

    // Check if user has RSVP'd
    const rsvp = await env.DB.prepare('SELECT 1 FROM event_rsvps WHERE event_id = ? AND user_id = ?').bind(id, user.sub).first();
    const hasRSVPd = !!rsvp;

    // Get RSVP participants
    const rsvpResult = await env.DB.prepare(`
      SELECT u.uid, u.display_name, u.photo_url
      FROM event_rsvps er
      LEFT JOIN users u ON er.user_id = u.uid
      WHERE er.event_id = ?
    `).bind(id).all();

    return {
      eventId: updatedEvent.id,
      clubId: updatedEvent.club_id,
      clubName: updatedEvent.club_name,
      authorId: updatedEvent.author_id,
      authorName: updatedEvent.author_name,
      name: updatedEvent.name,
      description: updatedEvent.description,
      eventDate: updatedEvent.event_date,
      imageUrl: updatedEvent.image_url,
      rsvpCount: updatedEvent.rsvp_count || 0,
      hasRSVPd,
      rsvpParticipants: rsvpResult.results.map((r: any) => ({
        uid: r.uid,
        displayName: r.display_name,
        photoUrl: r.photo_url
      })),
      createdAt: updatedEvent.created_at,
      updatedAt: updatedEvent.updated_at
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Delete Event
router.delete('/events/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Get the event to verify ownership
    const event = await env.DB.prepare('SELECT author_id FROM events WHERE id = ?').bind(id).first();

    if (!event) {
      return error(404, 'Event not found');
    }

    // Check if user is the author or a webmaster (admin)
    const currentUser = await env.DB.prepare('SELECT is_webmaster FROM users WHERE uid = ?').bind(user.sub).first();
    const isWebmaster = currentUser && currentUser.is_webmaster === 1;

    if (event.author_id !== user.sub && !isWebmaster) {
      return error(403, 'You can only delete your own events');
    }

    // Delete related data first (RSVPs)
    await env.DB.prepare('DELETE FROM event_rsvps WHERE event_id = ?').bind(id).run();

    // Delete the event
    await env.DB.prepare('DELETE FROM events WHERE id = ?').bind(id).run();

    return { success: true, message: 'Event deleted successfully' };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: RSVP to Event (Toggle)
router.post('/events/:id/rsvp', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Check if event exists
    const event = await env.DB.prepare('SELECT id, rsvp_count FROM events WHERE id = ?').bind(id).first();
    if (!event) {
      return error(404, 'Event not found');
    }

    // Check if user already RSVP'd
    const existingRSVP = await env.DB.prepare('SELECT 1 FROM event_rsvps WHERE event_id = ? AND user_id = ?').bind(id, user.sub).first();

    let hasRSVPd = false;
    let newRSVPCount = (event.rsvp_count as number) || 0;

    if (existingRSVP) {
      // Remove RSVP
      await env.DB.prepare('DELETE FROM event_rsvps WHERE event_id = ? AND user_id = ?').bind(id, user.sub).run();
      newRSVPCount = Math.max(0, newRSVPCount - 1);
      hasRSVPd = false;
    } else {
      // Add RSVP
      await env.DB.prepare('INSERT INTO event_rsvps (event_id, user_id) VALUES (?, ?)').bind(id, user.sub).run();
      newRSVPCount = newRSVPCount + 1;
      hasRSVPd = true;
    }

    // Update RSVP count on event
    await env.DB.prepare('UPDATE events SET rsvp_count = ? WHERE id = ?').bind(newRSVPCount, id).run();

    return {
      message: hasRSVPd ? `RSVP'd to event ${id}` : `Removed RSVP from event ${id}`,
      rsvpCount: newRSVPCount,
      hasRSVPd
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// 404 handler
router.all('*', () => error(404));

export default {
  fetch: router.fetch,
};
