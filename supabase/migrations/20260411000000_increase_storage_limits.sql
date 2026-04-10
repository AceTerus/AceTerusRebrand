-- Raise file size limits on storage buckets
-- profile-images: 300 MB (covers 30 MB images + 300 MB video reels)
-- user-uploads:   300 MB (materials bucket, same ceiling)

UPDATE storage.buckets
SET
  file_size_limit    = 314572800,  -- 300 MB in bytes
  allowed_mime_types = ARRAY[
    -- images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'image/webp', 'image/avif', 'image/svg+xml',
    -- videos (reels)
    'video/mp4', 'video/webm', 'video/quicktime',
    'video/avi', 'video/x-msvideo', 'video/ogg'
  ]
WHERE id = 'profile-images';

UPDATE storage.buckets
SET file_size_limit = 314572800   -- 300 MB
WHERE id = 'user-uploads';
