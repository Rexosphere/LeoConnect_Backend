import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../src/index';

// Mock verifyFirebaseToken
vi.mock('../src/auth', () => ({
  verifyFirebaseToken: vi.fn().mockResolvedValue({ 
    uid: 'user1', 
    sub: 'user1',
    email: 'user1@example.com',
    name: 'User One',
    picture: 'http://example.com/pic1.jpg'
  }),
}));

// Mock global fetch
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

describe('Messaging Endpoints', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('POST /messages sends a message', async () => {
    const request = new Request('http://localhost/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId: 'user2',
        content: 'Hello User 2'
      })
    });
    
    // Mock D1 response
    const env = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({})
          })
        })
      }
    };

    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    expect(response.status).toBe(200);
    
    const body: any = await response.json();
    expect(body.senderId).toBe('user1');
    expect(body.receiverId).toBe('user2');
    expect(body.content).toBe('Hello User 2');
    expect(body.isRead).toBe(false);
  });

  it('GET /conversations returns list of conversations', async () => {
    const request = new Request('http://localhost/conversations');
    
    // Mock D1 response
    const env = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({
              results: [
                {
                  other_user_id: 'user2',
                  content: 'Hello User 2',
                  created_at: '2023-01-02T00:00:00Z',
                  is_read: 0,
                  sender_id: 'user1',
                  receiver_id: 'user2'
                },
                {
                  other_user_id: 'user3',
                  content: 'Hi from User 3',
                  created_at: '2023-01-01T00:00:00Z',
                  is_read: 0,
                  sender_id: 'user3',
                  receiver_id: 'user1'
                }
              ]
            }),
            first: vi.fn()
              .mockResolvedValueOnce({ display_name: 'User Two', photo_url: 'pic2.jpg' }) // User 2 details
              .mockResolvedValueOnce({ count: 0 }) // User 2 unread count
              .mockResolvedValueOnce({ display_name: 'User Three', photo_url: 'pic3.jpg' }) // User 3 details
              .mockResolvedValueOnce({ count: 1 }) // User 3 unread count
          })
        })
      }
    };

    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    expect(response.status).toBe(200);
    
    const body: any = await response.json();
    expect(body).toHaveLength(2);
    expect(body[0].userId).toBe('user2');
    expect(body[0].lastMessage).toBe('Hello User 2');
    expect(body[1].userId).toBe('user3');
    expect(body[1].unreadCount).toBe(1);
  });

  it('GET /messages/:userId returns messages', async () => {
    const request = new Request('http://localhost/messages/user2');
    
    // Mock D1 response
    const env = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({
              results: [
                {
                  id: 'msg1',
                  sender_id: 'user1',
                  receiver_id: 'user2',
                  content: 'Hello',
                  is_read: 1,
                  created_at: '2023-01-01T00:00:00Z'
                },
                {
                  id: 'msg2',
                  sender_id: 'user2',
                  receiver_id: 'user1',
                  content: 'Hi',
                  is_read: 0,
                  created_at: '2023-01-01T00:01:00Z'
                }
              ]
            }),
            run: vi.fn().mockResolvedValue({}) // Mark as read
          })
        })
      }
    };

    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    expect(response.status).toBe(200);
    
    const body: any = await response.json();
    expect(body).toHaveLength(2);
    expect(body[0].content).toBe('Hello');
    expect(body[1].content).toBe('Hi');
  });

  it('DELETE /messages/:id deletes a message', async () => {
    const request = new Request('http://localhost/messages/msg1', {
      method: 'DELETE'
    });
    
    // Mock D1 response
    const env = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue({ id: 'msg1', sender_id: 'user1' }), // Message exists and belongs to user
            run: vi.fn().mockResolvedValue({}) // Delete
          })
        })
      }
    };

    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
  });

  it('DELETE /conversations/:userId deletes conversation', async () => {
    const request = new Request('http://localhost/conversations/user2', {
      method: 'DELETE'
    });
    
    // Mock D1 response
    const env = {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({}) // Delete
          })
        })
      }
    };

    const response = await worker.fetch(request, env, { waitUntil: () => {} });
    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.success).toBe(true);
  });
});
