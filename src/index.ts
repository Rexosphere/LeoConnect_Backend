import { AutoRouter, IRequest, error, cors } from 'itty-router';
import { verifyFirebaseToken } from './auth';
import { FirestoreClient } from './firestore';
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
router.get('/', () => ({ message: 'LeoConnect Backend is running!' }));

// Public: Auth with Google/Firebase
router.post('/auth/google', async (request, env) => {
  const token = request.headers.get('Authorization')?.split(' ')[1];
  if (!token) return error(400, 'Missing token');

  const payload = await verifyFirebaseToken(request, env);
  
  if (!payload || !payload.sub) {
    return error(401, 'Invalid token');
  }

  const firestore = new FirestoreClient(env);
  const uid = payload.sub;
  const email = (payload.email as string) || '';
  const name = (payload.name as string) || email;
  const picture = (payload.picture as string) || '';

  // Check if user exists
  let user = await firestore.getDocument('users', uid);

  if (!user) {
    // Create new user
    const newUser = {
      uid,
      email,
      displayName: name,
      photoURL: picture,
      leoId: null,
      isWebmaster: false,
      assignedClubId: null,
      followingClubs: [],
      postsCount: 0,
      followersCount: 0,
      followingCount: 0
    };
    // Use setDocument to ensure ID matches uid
    user = await firestore.setDocument('users', uid, newUser); 
  }

  // Return UserProfile
  return mapToUserProfile(user, uid);
});

// Protected: Get Home Feed
router.get('/feed', withAuth, async (request, env) => {
  const firestore = new FirestoreClient(env);
  const { limit } = request.query;
  const user = request.user;
  
  try {
    const rawPosts = await firestore.getCollection('posts');
    
    // Map to expected structure and check likes
    const posts = await Promise.all(rawPosts.map(async (p: any) => {
        // Check if liked by user
        // Optimization: In a real app, fetch all likes for this user in one go or use a better schema
        // For now, we do N+1 queries which is bad but acceptable for this scale/demo
        let isLiked = false;
        try {
            const likeDoc = await firestore.getDocument(`posts/${p.id}/likes`, user.sub);
            isLiked = !!likeDoc;
        } catch (e) {
            // Ignore error, assume not liked
        }

        const post = mapToPost(p, p.id);
        post.isLikedByUser = isLiked;
        return post;
    }));
    
    // Sort by timestamp desc
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return posts;
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Create Post
router.post('/posts', withAuth, async (request, env) => {
  const content = await request.json() as any;
  const firestore = new FirestoreClient(env);
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

    const newPost = {
      content: content.content,
      authorId: user.sub,
      authorName: user.name || user.email,
      authorLogo: user.picture || '',
      clubId: content.clubId || '',
      clubName: content.clubName || '', // Should be provided or fetched
      imageUrl,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isPinned: false,
      timestamp: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const post = await firestore.createDocument('posts', newPost);
    
    // Return full Post object
    return mapToPost(post, post.id);
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
  const firestore = new FirestoreClient(env);
  
  try {
    // Check if user already liked the post
    // We use a subcollection 'likes' under the post document: posts/{postId}/likes/{userId}
    const likeDocId = user.sub;
    const existingLike = await firestore.getDocument(`posts/${id}/likes`, likeDocId);
    
    let isLiked = false;
    let likesCountChange = 0;

    if (existingLike) {
      // Unlike: Delete the like document
      await firestore.deleteDocument(`posts/${id}/likes`, likeDocId);
      likesCountChange = -1;
      isLiked = false;
    } else {
      // Like: Create the like document
      await firestore.setDocument(`posts/${id}/likes`, likeDocId, {
        userId: user.sub,
        timestamp: new Date().toISOString()
      });
      likesCountChange = 1;
      isLiked = true;
    }

    // Update the post's likesCount
    const post = await firestore.getDocument('posts', id);
    if (post) {
      const currentCount = post.likesCount || 0;
      const newCount = Math.max(0, currentCount + likesCountChange);
      await firestore.updateDocument('posts', id, { likesCount: newCount });
      
      return { 
        message: isLiked ? `Liked post ${id}` : `Unliked post ${id}`,
        likesCount: newCount,
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
  const firestore = new FirestoreClient(env);
  const user = request.user;

  try {
    const comments = await firestore.query('comments', 'postId', 'EQUAL', id);
    
    // Sort by timestamp (newest first) - simplistic sorting in memory
    comments.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // TODO: Check if current user liked these comments (if we implement comment likes)
    
    return {
      comments: comments.map((c: any) => mapToComment(c, c.id)),
      total: comments.length,
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
  const firestore = new FirestoreClient(env);
  const user = request.user;

  if (!content.content || content.content.trim() === "") {
      return error(400, "Comment content cannot be empty");
  }

  try {
    const newComment = {
      postId: id,
      userId: user.sub,
      authorName: user.name || user.email,
      authorPhotoUrl: user.picture || '',
      content: content.content,
      likesCount: 0,
      timestamp: new Date().toISOString()
    };

    const comment = await firestore.createDocument('comments', newComment);
    
    // Increment comments count on the post
    const post = await firestore.getDocument('posts', id);
    if (post) {
        const currentCount = post.commentsCount || 0;
        await firestore.updateDocument('posts', id, { commentsCount: currentCount + 1 });
    }

    return {
      comment: mapToComment(comment, comment.id)
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Delete Comment
router.delete('/comments/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const firestore = new FirestoreClient(env);
  const user = request.user;

  try {
      const comment = await firestore.getDocument('comments', id);
      if (!comment) return error(404, 'Comment not found');

      // Check ownership
      if (comment.userId !== user.sub) {
          return error(403, 'You can only delete your own comments');
      }

      await firestore.deleteDocument('comments', id);

      // Decrement comments count on the post
      const post = await firestore.getDocument('posts', comment.postId);
      if (post) {
          const currentCount = post.commentsCount || 0;
          await firestore.updateDocument('posts', comment.postId, { commentsCount: Math.max(0, currentCount - 1) });
      }

      return { success: true };
  } catch (e: any) {
      return error(500, e.message);
  }
});

// Protected: Get Single Post
router.get('/posts/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const firestore = new FirestoreClient(env);
  const user = request.user;

  try {
    const postDoc = await firestore.getDocument('posts', id);
    if (!postDoc) return error(404, 'Post not found');
    
    // Fetch club details
    let club = null;
    if (postDoc.clubId) {
      const clubDoc = await firestore.getDocument('clubs', postDoc.clubId);
      if (clubDoc) {
          club = mapToClub(clubDoc, clubDoc.id);
      }
    }

    // Check if liked by user
    let isLiked = false;
    try {
        const likeDoc = await firestore.getDocument(`posts/${postDoc.id}/likes`, user.sub);
        isLiked = !!likeDoc;
    } catch (e) {
        // Ignore
    }

    const post = mapToPost(postDoc, postDoc.id);
    post.isLikedByUser = isLiked;

    return {
      post,
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
  const firestore = new FirestoreClient(env);
  try {
    const districts = await firestore.getCollection('districts');
    // Return just the names as strings, assuming document has 'name' field
    return districts.map((d: any) => d.name).sort();
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Public: Get Clubs by District
router.get('/clubs', async (request, env) => {
  const { district } = request.query;
  const firestore = new FirestoreClient(env);
  try {
    let clubs;
    if (district) {
      clubs = await firestore.query('clubs', 'district', 'EQUAL', district);
    } else {
      clubs = await firestore.getCollection('clubs');
    }
    
    // Map to expected structure
    return clubs.map((c: any) => mapToClub(c, c.id));
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Public: Get Posts by Club
router.get('/clubs/:id/posts', async (request, env) => {
  const { id } = request.params;
  const firestore = new FirestoreClient(env);
  // Optional: Check auth for isLikedByUser
  const token = request.headers.get('Authorization')?.split(' ')[1];
  let userSub = null;
  
  if (token) {
      // Try to decode token to get user ID for like status
      // In a real app, use verifyFirebaseToken but handle error gracefully if optional
      // For now, we'll skip complex auth check here or reuse withAuth logic if we want strict auth
      // Let's assume public access but if auth'd, we check likes
  }

  try {
    const rawPosts = await firestore.query('posts', 'clubId', 'EQUAL', id);
    
    // Map to expected structure
    const posts = await Promise.all(rawPosts.map(async (p: any) => {
        let isLiked = false;
        // TODO: If we have userSub, check likes
        
        const post = mapToPost(p, p.id);
        post.isLikedByUser = isLiked;
        return post;
    }));
    
    // Sort by timestamp desc
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return posts;
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Public User Profile
router.get('/users/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const firestore = new FirestoreClient(env);
  const currentUser = request.user;
  
  try {
    const userDoc = await firestore.getDocument('users', id);
    if (!userDoc) {
      return error(404, 'User not found');
    }

    // Check if following
    let isFollowing = false;
    // TODO: Implement follow check when follows collection exists
    // const followDoc = await firestore.getDocument(`users/${currentUser.sub}/following`, id);
    // isFollowing = !!followDoc;

    let isMutualFollow = false;
    // TODO: Implement mutual follow check
    
    const userProfile = mapToUserProfile(userDoc, userDoc.id);
    userProfile.isFollowing = isFollowing;
    userProfile.isMutualFollow = isMutualFollow;

    return userProfile;
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Public: Get Posts by User
router.get('/users/:id/posts', async (request, env) => {
  const { id } = request.params;
  const firestore = new FirestoreClient(env);
  
  try {
    const rawPosts = await firestore.query('posts', 'authorId', 'EQUAL', id); // Changed from userId to authorId based on Post model
    
    const posts = await Promise.all(rawPosts.map(async (p: any) => {
        let isLiked = false;
        // TODO: Check likes if auth token present
        
        const post = mapToPost(p, p.id);
        post.isLikedByUser = isLiked;
        return post;
    }));
    
    posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return posts;
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Current User Profile
router.get('/users/me', withAuth, async (request, env) => {
  const firestore = new FirestoreClient(env);
  const user = request.user;
  const { uid } = request.query;
  
  // Use provided uid or fallback to token sub
  const targetUid = (uid as string) || user.sub;
  
  try {
    const userDoc = await firestore.getDocument('users', targetUid);
    if (!userDoc) {
      return error(404, 'User not found');
    }
    
    return mapToUserProfile(userDoc, targetUid);
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Update User Profile
router.patch('/users/me', withAuth, async (request, env) => {
  const firestore = new FirestoreClient(env);
  const user = request.user;
  const body = await request.json() as any;
  
  try {
    // Only allow updating specific fields
    const updates: any = {};
    if (body.leoId !== undefined) updates.leoId = body.leoId;
    if (body.assignedClubId !== undefined) updates.assignedClubId = body.assignedClubId;
    if (body.bio !== undefined) updates.bio = body.bio; // Added bio update
    
    if (Object.keys(updates).length === 0) {
      return error(400, 'No valid fields to update');
    }

    const updatedDoc = await firestore.updateDocument('users', user.sub, updates);
    
    return mapToUserProfile(updatedDoc, user.sub);
  } catch (e: any) {
    return error(500, e.message);
  }
});

// 404 handler
router.all('*', () => error(404));

export default {
  fetch: router.fetch,
};
