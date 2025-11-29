-- Create table to store multiple images per post
CREATE TABLE IF NOT EXISTS public.post_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- (Optional) enable RLS and allow everyone to read post images
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view post images"
ON public.post_images
FOR SELECT
USING (true);




