-- Add cover_url to profiles for Facebook-style backdrop photo
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url text;
