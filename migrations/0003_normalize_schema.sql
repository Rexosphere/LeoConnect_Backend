-- Remove redundant columns from posts table
ALTER TABLE posts DROP COLUMN club_name;
ALTER TABLE posts DROP COLUMN author_name;
ALTER TABLE posts DROP COLUMN author_logo;

-- Remove redundant columns from comments table
ALTER TABLE comments DROP COLUMN author_name;
ALTER TABLE comments DROP COLUMN author_photo_url;
