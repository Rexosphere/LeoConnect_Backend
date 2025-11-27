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
    user = await firestore.createDocument('users', newUser); 
  }

  // Return UserProfile
  return {
    uid: user.uid || uid,
    email: user.email || email,
    displayName: user.displayName || name,
    photoURL: user.photoURL || picture,
    leoId: user.leoId || '',
    isWebmaster: user.isWebmaster || false,
    assignedClubId: user.assignedClubId || ''
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
      likesCount: p.likesCount || 0,
      isLikedByUser: false, 
      timestamp: p.timestamp || new Date().toISOString()
    }));
    
    return { posts };
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
      likesCount: post.likesCount,
      isLikedByUser: false
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

// Public: Get Districts
router.get('/districts', async (request, env) => {
  return ['District 306 A1', 'District 306 A2', 'District 306 B1'];
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
      president: c.president || ''
    }));
  } catch (e: any) {
    return error(500, e.message);
  }
});

// 404 handler
router.all('*', () => error(404));

export default {
  fetch: router.fetch,
};
