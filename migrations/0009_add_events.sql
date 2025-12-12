-- Events Table
CREATE TABLE events (
    id TEXT PRIMARY KEY,
    club_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date DATETIME NOT NULL,
    image_url TEXT,
    rsvp_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(uid) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Event RSVP (Many-to-Many)
CREATE TABLE event_rsvps (
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
);

-- Index for event queries
CREATE INDEX idx_events_club_id ON events(club_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_event_rsvps_event_id ON event_rsvps(event_id);
