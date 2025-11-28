import { AutoRouter, IRequest, error, cors } from 'itty-router';
import { verifyFirebaseToken } from './auth';
import { 
  mapToUserProfile, 
  mapToClub, 
  mapToPost, 
  mapToComment, 
  UserProfile, 
  Club, 
  Post, 
  Comment 
} from './models';

// Define Env interface for Cloudflare Bindings
export interface Env {
  // Add bindings here (e.g., KV, D1, Secrets)
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  MY_BUCKET: R2Bucket;
  DB: D1Database;
}

const { preflight, corsify } = cors();

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
      INSERT INTO users (uid, email, display_name, photo_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(uid, email, name, picture, now, now).run();
    
    user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(uid).first();
  }

  // Fetch following clubs
  const followingClubsResult = await env.DB.prepare('SELECT club_id FROM user_following_clubs WHERE user_id = ?').bind(uid).all();
  const followingClubs = followingClubsResult.results.map((r: any) => r.club_id);

  // Map D1 result to UserProfile
  // Note: D1 returns snake_case columns, mapper expects camelCase or we adjust mapper/query
  // Let's adjust the object passed to mapper to match what mapper expects (which was Firestore data)
  // OR better, update mapper to handle snake_case if we want to be clean, but for speed, let's map here.
  
  const userData = {
      uid: user.uid,
      email: user.email,
      displayName: user.display_name,
      photoURL: user.photo_url,
      leoId: user.leo_id,
      bio: user.bio,
      isWebmaster: user.is_webmaster === 1, // SQLite booleans are 0/1
      assignedClubId: user.assigned_club_id,
      followingClubs: followingClubs,
      postsCount: user.posts_count,
      followersCount: user.followers_count,
      followingCount: user.following_count
  };

  return mapToUserProfile(userData, uid);
});

// Protected: Get Home Feed
router.get('/feed', withAuth, async (request, env) => {
  const { limit } = request.query;
  const user = request.user;
  
  try {
    // Fetch posts
    const { results } = await env.DB.prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT ?').bind(limit || 20).all();
    
    const posts = await Promise.all(results.map(async (p: any) => {
        // Check if liked by user
        const like = await env.DB.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').bind(p.id, user.sub).first();
        const isLiked = !!like;

        // Fetch images (if separate table, otherwise use p.image_url)
        // For now assuming single image_url in posts table is primary, but we can fetch multiple if needed
        // const images = await env.DB.prepare('SELECT image_url FROM post_images WHERE post_id = ?').bind(p.id).all();
        
        const postData = {
            id: p.id,
            clubId: p.club_id,
            clubName: p.club_name,
            authorId: p.author_id,
            authorName: p.author_name,
            authorLogo: p.author_logo,
            content: p.content,
            imageUrl: p.image_url,
            images: p.image_url ? [p.image_url] : [], // TODO: Fetch from post_images if needed
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

// Protected: Create Post
router.post('/posts', withAuth, async (request, env) => {
  const content = await request.json() as any;
  const user = request.user;

  try {
    let imageUrl = null;
    
    // Handle Image Upload
    if (content.imageBytes) {
      const imageBuffer = Uint8Array.from(atob(content.imageBytes), c => c.charCodeAt(0));
      const filename = `posts/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      await env.MY_BUCKET.put(filename, imageBuffer, {
        httpMetadata: { contentType: 'image/jpeg' },
      });
      
      const url = new URL(request.url);
      imageUrl = `${url.origin}/images/${filename}`;
    }

    const postId = `post-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
        INSERT INTO posts (id, club_id, club_name, author_id, author_name, author_logo, content, image_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        postId, 
        content.clubId || '', 
        content.clubName || '', 
        user.sub, 
        user.name || user.email, 
        user.picture || '', 
        content.content, 
        imageUrl, 
        now, 
        now
    ).run();
    
    // Return full Post object
    const newPost = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first();
    
    // Map manually since we know structure
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

// Helper route to serve images from R2
router.get('/images/:path+', async (request, env) => {
  const { path } = request.params;
  const object = await env.MY_BUCKET.get(path);

  if (!object) {
    return error(404, 'Image not found');
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body, {
    headers,
  });
});

// Protected: Like Post
router.post('/posts/:id/like', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;
  
  try {
    // Check if user already liked the post
    const existingLike = await env.DB.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').bind(id, user.sub).first();
    
    let isLiked = false;
    let likesCountChange = 0;

    if (existingLike) {
      // Unlike
      await env.DB.batch([
          env.DB.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').bind(id, user.sub),
          env.DB.prepare('UPDATE posts SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').bind(id)
      ]);
      likesCountChange = -1;
      isLiked = false;
    } else {
      // Like
      await env.DB.batch([
          env.DB.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').bind(id, user.sub),
          env.DB.prepare('UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?').bind(id)
      ]);
      likesCountChange = 1;
      isLiked = true;
    }

    const post = await env.DB.prepare('SELECT likes_count FROM posts WHERE id = ?').bind(id).first();
    
    if (post) {
      return { 
        message: isLiked ? `Liked post ${id}` : `Unliked post ${id}`,
        likesCount: post.likes_count,
        isLikedByUser: isLiked
      };
    } else {
        return error(404, 'Post not found');
    }

  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Comments for Post
router.get('/posts/:id/comments', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    const { results } = await env.DB.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC').bind(id).all();
    
    return {
      comments: results.map((c: any) => ({
          commentId: c.id,
          postId: c.post_id,
          userId: c.user_id,
          authorName: c.author_name,
          authorPhotoUrl: c.author_photo_url,
          content: c.content,
          createdAt: c.created_at,
          likesCount: c.likes_count,
          isLikedByUser: false // TODO: Comment likes
      })),
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

  try {
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    await env.DB.batch([
        env.DB.prepare(`
            INSERT INTO comments (id, post_id, user_id, author_name, author_photo_url, content, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(commentId, id, user.sub, user.name || user.email, user.picture || '', content.content, now),
        env.DB.prepare('UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?').bind(id)
    ]);

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

      await env.DB.batch([
          env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id),
          env.DB.prepare('UPDATE posts SET comments_count = MAX(0, comments_count - 1) WHERE id = ?').bind(comment.post_id)
      ]);

      return { success: true };
  } catch (e: any) {
      return error(500, e.message);
  }
});

// Protected: Get Single Post
router.get('/posts/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    const post = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
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

    return {
      post: mappedPost,
      club,
      isFollowingClub: false // TODO: Check real status
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Share Post
router.post('/posts/:id/share', withAuth, async (request, env) => {
  return { shareId: 'share-123', sharesCount: 1 };
});

// Protected: Delete Post
router.delete('/posts/:id', withAuth, async (request, env) => {
  // TODO: Verify author or admin
  return { success: true };
});

// Protected: Follow User
router.post('/users/:id/follow', withAuth, async (request, env) => {
  return { isFollowing: true, followersCount: 1 };
});

// Protected: Unfollow User
router.delete('/users/:id/follow', withAuth, async (request, env) => {
  return { followersCount: 0 };
});

// Protected: Follow Club
router.post('/clubs/:id/follow', withAuth, async (request, env) => {
  return { isFollowing: true, followersCount: 1 };
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
    const { results } = await env.DB.prepare('SELECT * FROM posts WHERE club_id = ? ORDER BY created_at DESC').bind(id).all();
    
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
  
  try {
    const user = await env.DB.prepare('SELECT * FROM users WHERE uid = ?').bind(id).first();
    if (!user) {
      return error(404, 'User not found');
    }

    // Fetch following clubs
    const followingClubsResult = await env.DB.prepare('SELECT club_id FROM user_following_clubs WHERE user_id = ?').bind(id).all();
    const followingClubs = followingClubsResult.results.map((r: any) => r.club_id);

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
        postsCount: user.posts_count,
        followersCount: user.followers_count,
        followingCount: user.following_count
    };
    
    const userProfile = mapToUserProfile(userData, user.uid);
    userProfile.isFollowing = false; // TODO
    userProfile.isMutualFollow = false; // TODO

    return userProfile;
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Public: Get Posts by User
router.get('/users/:id/posts', async (request, env) => {
  const { id } = request.params;
  
  try {
    const { results } = await env.DB.prepare('SELECT * FROM posts WHERE author_id = ? ORDER BY created_at DESC').bind(id).all();
    
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
        postsCount: userDoc.posts_count,
        followersCount: userDoc.followers_count,
        followingCount: userDoc.following_count
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
    
    // Fetch following clubs (unchanged)
    const followingClubsResult = await env.DB.prepare('SELECT club_id FROM user_following_clubs WHERE user_id = ?').bind(user.sub).all();
    const followingClubs = followingClubsResult.results.map((r: any) => r.club_id);

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
        postsCount: updatedUser.posts_count,
        followersCount: updatedUser.followers_count,
        followingCount: updatedUser.following_count
    };

    return mapToUserProfile(userData, user.sub);
  } catch (e: any) {
    return error(500, e.message);
  }
});

// 404 handler
router.all('*', () => error(404));

export default {
  fetch: router.fetch,
};
