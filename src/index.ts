import { AutoRouter, IRequest, error, cors } from 'itty-router';
import { verifyFirebaseToken } from './auth';
import { FirestoreClient } from './firestore';

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
      leoId: '', // Placeholder
      isWebmaster: false,
      assignedClubId: '', // Placeholder
    };
    // Use setDocument to ensure ID matches uid
    user = await firestore.setDocument('users', uid, newUser); 
  }

  // Return UserProfile
  return {
    uid: user.uid || uid,
    email: user.email || email,
    displayName: user.displayName || name,
    photoURL: user.photoURL || picture,
    leoId: user.leoId || '',
    isWebmaster: user.isWebmaster || false,
    assignedClubId: user.assignedClubId || '',
    followingClubs: user.followingClubs || []
  };
});

// Protected: Get Home Feed
router.get('/feed', withAuth, async (request, env) => {
  const firestore = new FirestoreClient(env);
  const { limit } = request.query;
  
  try {
    const rawPosts = await firestore.getCollection('posts');
    // Map to expected structure
    const posts = rawPosts.map((p: any) => ({
      postId: p.id,
      clubId: p.clubId || 'unknown', 
      authorName: p.authorName || p.author || 'Unknown',
      authorLogo: p.authorLogo || '',
      content: p.content,
      imageUrl: p.imageUrl || '',
      images: p.images || (p.imageUrl ? [p.imageUrl] : []),
      likesCount: p.likesCount || 0,
      commentsCount: p.commentsCount || 0,
      sharesCount: p.sharesCount || 0,
      isLikedByUser: false,
      isPinned: p.isPinned || false,
      timestamp: p.timestamp || new Date().toISOString()
    }));
    
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
    let imageUrl = '';
    
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
      imageUrl,
      likesCount: 0,
      timestamp: new Date().toISOString()
    };

    const post = await firestore.createDocument('posts', newPost);
    
    // Return full Post object
    return {
      postId: post.id,
      clubId: post.clubId,
      authorName: post.authorName,
      authorLogo: post.authorLogo,
      content: post.content,
      imageUrl: post.imageUrl,
      images: post.images || [],
      likesCount: post.likesCount,
      commentsCount: 0,
      sharesCount: 0,
      isLikedByUser: false,
      isPinned: false
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
  // TODO: Implement atomic increment for likes using Firestore transform
  // For now, just return success with mocked data or fetch current count
  return { 
    message: `Liked post ${id}`,
    likesCount: 1, // Mocked
    isLikedByUser: true
  };
});

// Protected: Get Comments for Post
router.get('/posts/:id/comments', withAuth, async (request, env) => {
  const { id } = request.params;
  const firestore = new FirestoreClient(env);
  try {
    const comments = await firestore.query('comments', 'postId', 'EQUAL', id);
    return {
      comments: comments.map((c: any) => ({
        commentId: c.id,
        postId: c.postId,
        userId: c.userId,
        authorName: c.authorName,
        authorPhotoUrl: c.authorPhotoUrl,
        content: c.content,
        likesCount: c.likesCount || 0,
        timestamp: c.timestamp
      })),
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
    
    return {
      comment: {
        commentId: comment.id,
        ...newComment
      }
    };
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Delete Comment
router.delete('/comments/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  // TODO: Verify author or admin
  return { success: true };
});

// Protected: Get Single Post
router.get('/posts/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const firestore = new FirestoreClient(env);
  try {
    const post = await firestore.getDocument('posts', id);
    if (!post) return error(404, 'Post not found');
    
    // Fetch club details
    let club = null;
    if (post.clubId) {
      club = await firestore.getDocument('clubs', post.clubId);
    }

    return {
      post: {
        postId: post.id,
        clubId: post.clubId || '',
        authorName: post.authorName,
        authorLogo: post.authorLogo,
        content: post.content,
        imageUrl: post.imageUrl,
        images: post.images || (post.imageUrl ? [post.imageUrl] : []),
        likesCount: post.likesCount,
        commentsCount: post.commentsCount || 0,
        sharesCount: post.sharesCount || 0,
        isLikedByUser: false, // TODO: Check real status
        isPinned: post.isPinned || false,
        timestamp: post.timestamp
      },
      club: club ? {
        clubId: club.id,
        name: club.name,
        district: club.district,
        logoUrl: club.logoUrl || ''
      } : null,
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
    return clubs.map((c: any) => ({
      clubId: c.id,
      name: c.name,
      district: c.district,
      description: c.description || '',
      president: c.president || '',
      membersCount: c.membersCount || 0,
      followersCount: c.followersCount || 0,
      socialLinks: c.socialLinks || {},
      email: c.email || '',
      phone: c.phone || ''
    }));
  } catch (e: any) {
    return error(500, e.message);
  }
});

// Protected: Get Public User Profile
router.get('/users/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const firestore = new FirestoreClient(env);
  
  try {
    const userDoc = await firestore.getDocument('users', id);
    if (!userDoc) {
      return error(404, 'User not found');
    }
    
    return {
      profile: {
        uid: userDoc.uid,
        displayName: userDoc.displayName,
        photoURL: userDoc.photoURL,
        leoId: userDoc.leoId || '',
        isWebmaster: userDoc.isWebmaster || false,
        assignedClubId: userDoc.assignedClubId || '',
        followingClubs: userDoc.followingClubs || []
      },
      stats: {
        postsCount: userDoc.postsCount || 0,
        followersCount: userDoc.followersCount || 0,
        followingCount: userDoc.followingCount || 0
      },
      recentPosts: [] // TODO: Fetch recent posts
    };
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
    
    return {
      uid: userDoc.uid,
      email: userDoc.email,
      displayName: userDoc.displayName,
      photoURL: userDoc.photoURL,
      leoId: userDoc.leoId || '',
      isWebmaster: userDoc.isWebmaster || false,
      assignedClubId: userDoc.assignedClubId || '',
      followingClubs: userDoc.followingClubs || [],
      followersCount: userDoc.followersCount || 0,
      followingCount: userDoc.followingCount || 0,
      postsCount: userDoc.postsCount || 0
    };
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
    
    if (Object.keys(updates).length === 0) {
      return error(400, 'No valid fields to update');
    }

    const updatedDoc = await firestore.updateDocument('users', user.sub, updates);
    
    return {
      uid: updatedDoc.uid,
      email: updatedDoc.email,
      displayName: updatedDoc.displayName,
      photoURL: updatedDoc.photoURL,
      leoId: updatedDoc.leoId || '',
      isWebmaster: updatedDoc.isWebmaster || false,
      assignedClubId: updatedDoc.assignedClubId || '',
      followingClubs: updatedDoc.followingClubs || []
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
