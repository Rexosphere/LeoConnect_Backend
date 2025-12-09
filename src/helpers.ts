// Helper functions to compute counts from database relationships

export async function getUserCounts(db: D1Database, userId: string) {
  const [postsCount, followersCount, followingCount] = await Promise.all([
    // Count posts by user
    db.prepare('SELECT COUNT(*) as count FROM posts WHERE author_id = ?').bind(userId).first(),
    // Count followers (users who follow this user)
    db.prepare('SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?').bind(userId).first(),
    // Count following (users this user follows)
    db.prepare('SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?').bind(userId).first(),
  ]);

  return {
    postsCount: (postsCount as any)?.count || 0,
    followersCount: (followersCount as any)?.count || 0,
    followingCount: (followingCount as any)?.count || 0,
  };
}

export async function getClubCounts(db: D1Database, clubId: string) {
  const [membersCount, followersCount, postsCount] = await Promise.all([
    // Count members (users with this club as assigned_club_id)
    db.prepare('SELECT COUNT(*) as count FROM users WHERE assigned_club_id = ?').bind(clubId).first(),
    // Count followers (users who follow this club)
    db.prepare('SELECT COUNT(*) as count FROM user_following_clubs WHERE club_id = ?').bind(clubId).first(),
    // Count posts by club
    db.prepare('SELECT COUNT(*) as count FROM posts WHERE club_id = ?').bind(clubId).first(),
  ]);

  return {
    membersCount: (membersCount as any)?.count || 0,
    followersCount: (followersCount as any)?.count || 0,
    postsCount: (postsCount as any)?.count || 0,
  };
}

export async function getPostCounts(db: D1Database, postId: string) {
  const [likesCount, commentsCount] = await Promise.all([
    // Count likes
    db.prepare('SELECT COUNT(*) as count FROM post_likes WHERE post_id = ?').bind(postId).first(),
    // Count comments
    db.prepare('SELECT COUNT(*) as count FROM comments WHERE post_id = ?').bind(postId).first(),
  ]);

  return {
    likesCount: (likesCount as any)?.count || 0,
    commentsCount: (commentsCount as any)?.count || 0,
    sharesCount: 0, // TODO: Implement shares table if needed
  };
}

export async function getCommentLikesCount(db: D1Database, commentId: string) {
  // TODO: Create comment_likes table if needed
  return 0;
}

export async function isUserFollowingUser(db: D1Database, followerId: string, followingId: string): Promise<boolean> {
  const result = await db.prepare(
    'SELECT 1 FROM user_follows WHERE follower_id = ? AND following_id = ?'
  ).bind(followerId, followingId).first();
  return !!result;
}

export async function isUserFollowingClub(db: D1Database, userId: string, clubId: string): Promise<boolean> {
  const result = await db.prepare(
    'SELECT 1 FROM user_following_clubs WHERE user_id = ? AND club_id = ?'
  ).bind(userId, clubId).first();
  return !!result;
}
