import { Router, IRequest } from 'itty-router';
import { json } from '../utils/http';
import { Env } from '../index';
import { withAuth } from '../middleware/auth';

export const commentsRouter = Router();

// Protected: Get Comments for Post
commentsRouter.get('/posts/:id/comments', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    const { results } = await env.DB.prepare(`
        SELECT c.*, u.display_name as author_name, u.photo_url as author_photo_url
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.uid
        WHERE c.post_id = ?
        ORDER BY c.created_at DESC
    `).bind(id).all();

    // Map comments with like status
    const comments = await Promise.all(results.map(async (c: any) => {
      // Check if current user liked this comment
      const likeCheck = await env.DB.prepare(
        'SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_id = ?'
      ).bind(c.id, user.sub).first();

      return {
        commentId: c.id,
        postId: c.post_id,
        userId: c.user_id,
        authorName: c.author_name,
        authorPhotoUrl: c.author_photo_url,
        content: c.content,
        createdAt: c.created_at,
        likesCount: c.likes_count || 0,
        isLikedByUser: !!likeCheck
      };
    }));

    return {
      comments,
      total: results.length,
      hasMore: false
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Add Comment to Post
commentsRouter.post('/posts/:id/comments', withAuth, async (request, env) => {
  const { id } = request.params;
  const content = await request.json() as any;
  const user = request.user;

  if (!content.content || content.content.trim() === "") {
    return json(400, { status: 400, error: "Comment content cannot be empty" });
  }

  if (content.content.length > 2000) {
    return json(400, { status: 400, error: "Comment exceeds maximum length of 2000 characters" });
  }

  try {
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(`
        INSERT INTO comments (id, post_id, user_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
    `).bind(commentId, id, user.sub, content.content, now).run();

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
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Delete Comment
commentsRouter.delete('/comments/:id', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    const comment = await env.DB.prepare('SELECT * FROM comments WHERE id = ?').bind(id).first();
    if (!comment) return json(404, { status: 404, error: 'Comment not found' });

    // Check ownership
    if (comment.user_id !== user.sub) {
      return json(403, { status: 403, error: 'You can only delete your own comments' });
    }

    await env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();

    return { success: true };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});

// Protected: Like/Unlike Comment
commentsRouter.post('/comments/:id/like', withAuth, async (request, env) => {
  const { id } = request.params;
  const user = request.user;

  try {
    // Check if comment exists
    const comment = await env.DB.prepare('SELECT id, likes_count FROM comments WHERE id = ?').bind(id).first();
    if (!comment) {
      return json(404, { status: 404, error: 'Comment not found' });
    }

    // Check if already liked
    const existingLike = await env.DB.prepare(
      'SELECT 1 FROM comment_likes WHERE comment_id = ? AND user_id = ?'
    ).bind(id, user.sub).first();

    let isLiked = false;
    let newLikesCount = comment.likes_count || 0;

    if (existingLike) {
      // Unlike - remove like
      await env.DB.prepare('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?').bind(id, user.sub).run();
      newLikesCount = Math.max(0, newLikesCount - 1);
      isLiked = false;
    } else {
      // Like - add like
      await env.DB.prepare('INSERT INTO comment_likes (comment_id, user_id) VALUES (?, ?)').bind(id, user.sub).run();
      newLikesCount += 1;
      isLiked = true;
    }

    // Update likes count on comment
    await env.DB.prepare('UPDATE comments SET likes_count = ? WHERE id = ?').bind(newLikesCount, id).run();

    return {
      isLikedByUser: isLiked,
      likesCount: newLikesCount
    };
  } catch (e: any) {
    return json(500, { status: 500, error: e?.message ?? String(e) });
  }
});
