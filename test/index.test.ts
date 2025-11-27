import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../src/index';

// Mock verifyFirebaseToken
vi.mock('../src/auth', () => ({
  verifyFirebaseToken: vi.fn().mockResolvedValue({ uid: 'test-user' }),
}));

// Mock global fetch
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

describe('LeoConnect Backend', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('GET / returns 200', async () => {
    const request = new Request('http://localhost/');
    const response = await worker.fetch(request, {}, { waitUntil: () => {} });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('message', 'LeoConnect Backend is running!');
  });

  it('GET /districts returns list', async () => {
    const request = new Request('http://localhost/districts');
    const response = await worker.fetch(request, {}, { waitUntil: () => {} });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('GET /feed with auth fetches from Firestore', async () => {
    // Mock Firestore response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        documents: [
          {
            name: 'projects/test/databases/(default)/documents/posts/1',
            fields: {
              content: { stringValue: 'Hello Firestore' },
              likes: { integerValue: '5' }
            }
          }
        ]
      })
    });

    const request = new Request('http://localhost/feed', {
      headers: { Authorization: 'Bearer valid-token' }
    });
    const env = { FIREBASE_PROJECT_ID: 'test-project' };
    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    
    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.posts).toHaveLength(1);
    expect(body.posts[0]).toEqual({ id: '1', content: 'Hello Firestore', likes: 5 });
    
    // Verify fetch called with correct URL
    expect(fetchMock).toHaveBeenCalledWith(
      'https://firestore.googleapis.com/v1/projects/test-project/databases/(default)/documents/posts'
    );
  });
});
