-- Add is_published to quiz_categories so admins control visibility
ALTER TABLE quiz_categories
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;
