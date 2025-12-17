-- Add public_key column to users table for E2E encryption
ALTER TABLE users ADD COLUMN public_key TEXT;
