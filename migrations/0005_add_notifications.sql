-- Add FCM tokens table for push notifications
CREATE TABLE fcm_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    device_id TEXT,
    device_type TEXT, -- 'android', 'ios', 'web'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
    UNIQUE(user_id, token)
);

-- Add notifications table for notification history
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'message', 'follow', 'post', 'like', 'comment'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data TEXT, -- JSON string with additional data
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
);

-- Add notification preferences table
CREATE TABLE notification_preferences (
    user_id TEXT PRIMARY KEY,
    messages_enabled BOOLEAN DEFAULT TRUE,
    follows_enabled BOOLEAN DEFAULT TRUE,
    posts_enabled BOOLEAN DEFAULT TRUE,
    likes_enabled BOOLEAN DEFAULT TRUE,
    comments_enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_fcm_tokens_user ON fcm_tokens(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
