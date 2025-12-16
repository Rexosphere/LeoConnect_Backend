import { Router, IRequest } from 'itty-router';
import { json } from '../utils/http';
import { Env } from '../index';
import { withAuth } from '../middleware/auth';
import {
  mapToPost,
  mapToClub
} from '../models';
import {
  getPostCounts,
  isUserFollowingClub
} from '../helpers';
import {
  notifyNewPostFromFollowing
} from '../notifications';

export const postsRouter = Router();

// Protected: Get Home Feed (Posts from followed users and clubs)
postsRouter.get('/feed', withAuth, async (request, env) => {
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
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Get Explore Feed (All posts from anyone)
postsRouter.get('/explore', withAuth, async (request, env) => {
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
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Create Post
postsRouter.post('/posts', withAuth, async (request, env) => {
  const content = await request.json() as any;
  const user = request.user;

  try {
    // Check if user is verified
    const currentUser = await env.DB.prepare('SELECT is_verified FROM users WHERE uid = ?').bind(user.sub).first();
    if (!currentUser || currentUser.is_verified !== 1) {
      return json(403, { status: 403, error: 'You must verify your Leo ID before creating posts' });
    }

    // Input validation
    if (!content.content || typeof content.content !== 'string') {
      return json(400, { status: 400, error: 'Post content is required' });
    }

    const trimmedContent = content.content.trim();
    if (trimmedContent.length === 0) {
      return json(400, { status: 400, error: 'Post content cannot be empty' });
    }

    if (trimmedContent.length > 5000) {
      return json(400, { status: 400, error: 'Post content exceeds maximum length of 5000 characters' });
    }

    // Handle multiple images (up to 4)
    const imagesList = content.imagesList || [];

    // Validate number of images
    if (imagesList.length > 4) {
      return json(400, { status: 400, error: 'Maximum of 4 images allowed per post' });
    }

    // Validate each image size (max 10MB base64 each)
    for (const img of imagesList) {
      if (img.imageBytes && img.imageBytes.length > 13333333) {
        return json(400, { status: 400, error: 'Each image size must not exceed 10MB' });
      }
    }

    const imageUrls: string[] = [];

    // Handle Multiple Image Uploads to Discord
    for (const img of imagesList) {
      if (img.imageBytes && img.imageBytes.length > 0) {
        try {
          // Decode base64 image data
          const imageData = Uint8Array.from(atob(img.imageBytes), c => c.charCodeAt(0));

          // Generate unique filename
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substring(7);
          const extension = img.imageMimeType?.split('/')[1] || 'jpg';
          const filename = `post-${timestamp}-${randomId}.${extension}`;

          // Create FormData for Discord webhook
          const formData = new FormData();
          const blob = new Blob([imageData], { type: img.imageMimeType || 'image/jpeg' });
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

          // Add the Discord CDN URL to our list
          imageUrls.push(attachment.url);
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          // Continue without this image if upload fails
        }
      }
    }

    // For backward compatibility, set imageUrl to first image if available
    const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

    let clubId = content.clubId;
    if (!clubId) {
      // Assign random club if not provided
      const randomClub = await env.DB.prepare('SELECT id FROM clubs ORDER BY RANDOM() LIMIT 1').first();
      if (randomClub) {
        clubId = randomClub.id;
      } else {
        // Fallback if no clubs exist (shouldn't happen in real app but good for safety)
        return json(400, { status: 400, error: 'No clubs available to assign post to' });
      }
    }

    const postId = `post-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();
    const imagesJson = imageUrls.length > 0 ? JSON.stringify(imageUrls) : null;

    await env.DB.prepare(`
        INSERT INTO posts (id, club_id, author_id, content, image_url, images_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      postId,
      clubId,
      user.sub,
      content.content,
      imageUrl,
      imagesJson,
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
      return json(500, { status: 500, error: 'Failed to create post' });
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
      images: imageUrls,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isLikedByUser: false,
      isPinned: false,
      createdAt: newPost.created_at,
      updatedAt: newPost.updated_at
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});


// Protected: Like Post
postsRouter.post('/posts/:id/like', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Check if post exists
    const post = await env.DB.prepare('SELECT id FROM posts WHERE id = ?').bind(id).first();
    if (!post) {
      return json(404, { status: 404, error: 'Post not found' });
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
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Get Single Post
postsRouter.get('/posts/:id', withAuth, async (request, env) => {
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
    if (!post) return json(404, { status: 404, error: 'Post not found' });

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

    // Parse images from images_json or fallback to imageUrl
    let images: string[] = [];
    if (post.images_json) {
      try {
        images = JSON.parse(post.images_json);
      } catch (e) {
        console.error('Failed to parse images_json:', e);
      }
    }
    if (images.length === 0 && post.image_url) {
      images = [post.image_url];
    }

    const postData = {
      id: post.id,
      clubId: post.club_id,
      clubName: post.club_name,
      authorId: post.author_id,
      authorName: post.author_name,
      authorLogo: post.author_logo,
      content: post.content,
      imageUrl: post.image_url,
      images: images,
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
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Share Post
postsRouter.post('/posts/:id/share', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Check if post exists
    const post = await env.DB.prepare('SELECT id, shares_count FROM posts WHERE id = ?').bind(id).first();
    if (!post) {
      return json(404, { status: 404, error: 'Post not found' });
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
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Update Post
postsRouter.put('/posts/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;
  const body = await request.json() as any;

  try {
    // Get the post to verify ownership
    const post = await env.DB.prepare('SELECT author_id FROM posts WHERE id = ?').bind(id).first();

    if (!post) {
      return json(404, { status: 404, error: 'Post not found' });
    }

    // Check if user is the author or a webmaster (admin)
    const currentUser = await env.DB.prepare('SELECT is_webmaster FROM users WHERE uid = ?').bind(user.sub).first();
    const isWebmaster = currentUser && currentUser.is_webmaster === 1;

    if (post.author_id !== user.sub && !isWebmaster) {
      return json(403, { status: 403, error: 'You can only edit your own posts' });
    }

    // Validate content
    if (!body.content || typeof body.content !== 'string') {
      return json(400, { status: 400, error: 'Post content is required' });
    }

    const trimmedContent = body.content.trim();
    if (trimmedContent.length === 0) {
      return json(400, { status: 400, error: 'Post content cannot be empty' });
    }

    if (trimmedContent.length > 5000) {
      return json(400, { status: 400, error: 'Post content exceeds maximum length of 5000 characters' });
    }

    // Update the post
    const now = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE posts SET content = ?, updated_at = ? WHERE id = ?
    `).bind(trimmedContent, now, id).run();

    // Return updated post
    const updatedPost = await env.DB.prepare(`
      SELECT p.*, u.display_name as author_name, u.photo_url as author_logo, c.name as club_name
      FROM posts p
      LEFT JOIN users u ON p.author_id = u.uid
      LEFT JOIN clubs c ON p.club_id = c.id
      WHERE p.id = ?
    `).bind(id).first();

    if (!updatedPost) {
      return json(500, { status: 500, error: 'Failed to retrieve updated post' });
    }

    // Check if liked by user
    const like = await env.DB.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').bind(id, user.sub).first();
    const isLiked = !!like;

    const counts = await getPostCounts(env.DB, id);

    return {
      postId: updatedPost.id,
      clubId: updatedPost.club_id,
      clubName: updatedPost.club_name,
      authorId: updatedPost.author_id,
      authorName: updatedPost.author_name,
      authorLogo: updatedPost.author_logo,
      content: updatedPost.content,
      imageUrl: updatedPost.image_url,
      images: updatedPost.image_url ? [updatedPost.image_url] : [],
      ...counts,
      isLikedByUser: isLiked,
      isPinned: updatedPost.is_pinned === 1,
      createdAt: updatedPost.created_at,
      updatedAt: updatedPost.updated_at
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Delete Post
postsRouter.delete('/posts/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Get the post to verify ownership
    const post = await env.DB.prepare('SELECT author_id FROM posts WHERE id = ?').bind(id).first();

    if (!post) {
      return json(404, { status: 404, error: 'Post not found' });
    }

    // Check if user is the author or a webmaster (admin)
    const currentUser = await env.DB.prepare('SELECT is_webmaster FROM users WHERE uid = ?').bind(user.sub).first();
    const isWebmaster = currentUser && currentUser.is_webmaster === 1;

    if (post.author_id !== user.sub && !isWebmaster) {
      return json(403, { status: 403, error: 'You can only delete your own posts' });
    }

    // Delete related data first (comments, likes, images)
    await env.DB.prepare('DELETE FROM comments WHERE post_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM post_likes WHERE post_id = ?').bind(id).run();
    await env.DB.prepare('DELETE FROM post_images WHERE post_id = ?').bind(id).run();

    // Delete the post
    await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();

    return { success: true, message: 'Post deleted successfully' };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});
