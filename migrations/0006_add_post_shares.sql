-- Post Shares Table
CREATE TABLE IF NOT EXISTS post_shares (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
);

-- Unique constraint to prevent duplicate shares
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_shares_unique ON post_shares(post_id, user_id);
