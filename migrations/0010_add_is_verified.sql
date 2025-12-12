-- Add is_verified column to users table
ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0;

-- Create index for faster verification checks
CREATE INDEX idx_users_is_verified ON users(is_verified);
