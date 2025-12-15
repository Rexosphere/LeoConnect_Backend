import { AutoRouter, error } from 'itty-router';
import { mapToClub, mapToPost } from '../models';

export const searchRouter = AutoRouter();

// Public: Search Autocomplete
searchRouter.get('/search/autocomplete', async (request, env) => {
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
searchRouter.get('/search/users', async (request, env) => {
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
searchRouter.get('/search', async (request, env) => {
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
