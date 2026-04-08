-- Add image support to answer options
ALTER TABLE answers ADD COLUMN IF NOT EXISTS image_url TEXT;
