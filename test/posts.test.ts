import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../src/index';

// Mock verifyFirebaseToken
vi.mock('../src/auth', () => ({
  verifyFirebaseToken: vi.fn().mockResolvedValue({ 
    uid: 'test-user', 
    sub: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'http://example.com/pic.jpg'
  }),
}));

// Mock global fetch
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

describe('Create Post Endpoint', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('POST /posts creates post with placeholder image when imageBytes provided', async () => {
    const request = new Request('http://localhost/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Test Post',
        imageBytes: 'base64string'
      })
    });
    
    // Mock D1 response
    const env = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({}),
            first: vi.fn()
                .mockResolvedValueOnce({ id: 'club1' }) // Random club
                .mockResolvedValueOnce({ // New post with joined data
                    id: 'post1', 
                    club_id: 'club1', 
                    club_name: 'Club One', 
                    author_id: 'user1', 
                    author_name: 'User One', 
                    author_logo: 'pic.jpg', 
                    content: 'Hello World', 
                    image_url: 'https://placehold.co/600x400',
                    created_at: '2023-01-01T00:00:00Z',
                    updated_at: '2023-01-01T00:00:00Z'
                }) 
          })
        }),
      MY_BUCKET: {
        put: vi.fn()
      }
      }
    };

    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    expect(response.status).toBe(200);
    
    const body: any = await response.json();
    expect(body.content).toBe('Hello World');
    expect(body.imageUrl).toBe('https://placehold.co/600x400');
    expect(body.clubId).toBe('club1');
    expect(body.clubName).toBe('Club One');
    expect(body.authorName).toBe('User One');
    expect(env.MY_BUCKET.put).not.toHaveBeenCalled();
  });

  it('POST /posts handles missing clubId by assigning random club', async () => {
    const request = new Request('http://localhost/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'No Club Post'
      })
    });
    
    // Mock D1 response
    const env = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({}),
            first: vi.fn()
                .mockResolvedValueOnce({ id: 'random-club' }) // Random club query result
                .mockResolvedValueOnce({ // New post with joined data
                    id: 'post2', 
                    club_id: 'random-club', 
                    club_name: 'Random Club', 
                    author_id: 'user1', 
                    author_name: 'User One', 
                    author_logo: 'pic.jpg', 
                    content: 'No Club Post', 
                    image_url: null,
                    created_at: '2023-01-01T00:00:00Z',
                    updated_at: '2023-01-01T00:00:00Z'
                }) 
          }),
          first: vi.fn().mockResolvedValue({ id: 'random-club' }) // For the random club query
        })
      }
    };

    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    expect(response.status).toBe(200);
    
    const body: any = await response.json();
    expect(body.clubId).toBe('random-club');
    expect(body.clubName).toBe('Random Club');
  });

  it('POST /posts creates post without image when no imageBytes provided', async () => {
    const request = new Request('http://localhost/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Test Post No Image'
      })
    });
    
    // Mock D1 response
    const env = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({}),
            first: vi.fn().mockResolvedValue({
              id: 'post-124',
              club_id: '',
              club_name: '',
              author_id: 'test-user',
              author_name: 'Test User',
              author_logo: 'http://example.com/pic.jpg',
              content: 'Test Post No Image',
              image_url: null,
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z'
            })
          })
        })
      }
    };

    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    expect(response.status).toBe(200);
    
    const body: any = await response.json();
    expect(body.imageUrl).toBeNull();
  });
});
