-- Messages Table
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(uid) ON DELETE CASCADE
);

-- Index for faster retrieval of conversations
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_receiver_sender ON messages(receiver_id, sender_id);
