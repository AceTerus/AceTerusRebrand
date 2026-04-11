-- Make the user-uploads bucket public so file_url public links work
UPDATE storage.buckets
SET public = true
WHERE id = 'user-uploads';

-- Drop the private-only SELECT policy and replace with a public one
DROP POLICY IF EXISTS "Users can view their own uploads" ON storage.objects;

CREATE POLICY "Public read access for user uploads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-uploads');
