-- Add images_json column to posts table to support multiple images per post
ALTER TABLE posts ADD COLUMN images_json TEXT;

-- Create index for faster queries on posts with images
CREATE INDEX idx_posts_images_json ON posts(images_json) WHERE images_json IS NOT NULL;

-- Migration notes:
-- - images_json stores an array of image URLs as JSON
-- - Backward compatible: image_url column is maintained for the first image
-- - Posts can now have up to 4 images
