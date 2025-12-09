-- Add user following/followers table (Many-to-Many)
CREATE TABLE user_follows (
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(uid) ON DELETE CASCADE
);

-- Add onboarding_completed flag to track first-time users
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;

-- Remove redundant count columns from users table
-- SQLite doesn't support DROP COLUMN in older versions, but Cloudflare D1 supports it
ALTER TABLE users DROP COLUMN posts_count;
ALTER TABLE users DROP COLUMN followers_count;
ALTER TABLE users DROP COLUMN following_count;

-- Remove redundant count columns from clubs table
ALTER TABLE clubs DROP COLUMN members_count;
ALTER TABLE clubs DROP COLUMN followers_count;
ALTER TABLE clubs DROP COLUMN posts_count;

-- Remove redundant count columns from posts table
ALTER TABLE posts DROP COLUMN likes_count;
ALTER TABLE posts DROP COLUMN comments_count;
ALTER TABLE posts DROP COLUMN shares_count;

-- Remove redundant count column from comments table
ALTER TABLE comments DROP COLUMN likes_count;

-- Create indexes for better performance on relationship queries
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
CREATE INDEX idx_user_following_clubs_user ON user_following_clubs(user_id);
CREATE INDEX idx_user_following_clubs_club ON user_following_clubs(club_id);
CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_id);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_club ON posts(club_id);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_user ON comments(user_id);
