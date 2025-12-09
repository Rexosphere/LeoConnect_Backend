import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../src/index';

// Mock verifyFirebaseToken
vi.mock('../src/auth', () => ({
  verifyFirebaseToken: vi.fn().mockResolvedValue({ uid: 'test-user' }),
}));

// Mock global fetch
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

describe('Search Endpoints', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('GET /search/autocomplete returns suggestions', async () => {
    const request = new Request('http://localhost/search/autocomplete?q=test');
    
    // Mock D1 response
    const env = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn()
              .mockResolvedValueOnce({ results: [{ id: 'c1', name: 'Test Club' }] }) // Clubs
              .mockResolvedValueOnce({ results: [{ name: 'Test District' }] }) // Districts
              .mockResolvedValueOnce({ results: [{ id: 'p1', content: 'Test Post Content' }] }) // Posts
          })
        })
      }
    };

    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    expect(response.status).toBe(200);
    
    const body: any = await response.json();
    expect(body).toHaveProperty('clubs');
    expect(body.clubs).toHaveLength(1);
    expect(body.clubs[0]).toEqual({ id: 'c1', name: 'Test Club' });
    
    expect(body).toHaveProperty('districts');
    expect(body.districts).toHaveLength(1);
    expect(body.districts[0]).toBe('Test District');
    
    expect(body).toHaveProperty('posts');
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0]).toEqual({ id: 'p1', title: 'Test Post Content...' });
  });

  it('GET /search returns full results', async () => {
    const request = new Request('http://localhost/search?q=test');
    
    // Mock D1 response
    const env = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn()
              .mockResolvedValueOnce({ results: [{ 
                  id: 'c1', 
                  name: 'Test Club',
                  district: 'D1',
                  district_id: 'd1',
                  description: 'Desc',
                  logo_url: null,
                  cover_image_url: null,
                  members_count: 10,
                  followers_count: 5,
                  posts_count: 2,
                  is_official: 1,
                  address: null,
                  email: null,
                  phone: null,
                  facebook_url: null,
                  instagram_url: null,
                  twitter_url: null
              }] }) // Clubs
              .mockResolvedValueOnce({ results: [{ name: 'Test District', total_clubs: 5, total_members: 100 }] }) // Districts
              .mockResolvedValueOnce({ results: [{ 
                  id: 'p1', 
                  club_id: 'c1',
                  club_name: 'Test Club',
                  author_id: 'u1',
                  author_name: 'User',
                  author_logo: null,
                  content: 'Test Post Content',
                  image_url: null,
                  likes_count: 0,
                  comments_count: 0,
                  shares_count: 0,
                  is_pinned: 0,
                  created_at: '2023-01-01T00:00:00Z',
                  updated_at: '2023-01-01T00:00:00Z'
              }] }) // Posts
          })
        })
      }
    };

    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    expect(response.status).toBe(200);
    
    const body: any = await response.json();
    expect(body.clubs).toHaveLength(1);
    expect(body.clubs[0].name).toBe('Test Club');
    
    expect(body.districts).toHaveLength(1);
    expect(body.districts[0].name).toBe('Test District');
    
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0].content).toBe('Test Post Content');
  });

  it('GET /search/users returns users', async () => {
    const request = new Request('http://localhost/search/users?q=test');
    
    // Mock D1 response
    const env = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ 
              results: [{ uid: 'u1', display_name: 'Test User', photo_url: 'pic.jpg' }] 
            })
          })
        })
      }
    };

    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    expect(response.status).toBe(200);
    
    const body: any = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].userId).toBe('u1');
    expect(body[0].displayName).toBe('Test User');
  });
});
