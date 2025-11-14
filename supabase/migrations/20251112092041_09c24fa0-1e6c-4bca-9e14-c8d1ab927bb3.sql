-- Update RLS policies for uploads to allow viewing all uploads
DROP POLICY IF EXISTS "Users can view their own uploads" ON public.uploads;

CREATE POLICY "Everyone can view all uploads" 
ON public.uploads 
FOR SELECT 
USING (true);

-- Create upload_likes table
CREATE TABLE public.upload_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, upload_id)
);

ALTER TABLE public.upload_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all upload likes" 
ON public.upload_likes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own upload likes" 
ON public.upload_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own upload likes" 
ON public.upload_likes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create upload_comments table
CREATE TABLE public.upload_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  upload_id UUID NOT NULL REFERENCES public.uploads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.upload_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all upload comments" 
ON public.upload_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own upload comments" 
ON public.upload_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own upload comments" 
ON public.upload_comments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own upload comments" 
ON public.upload_comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add likes_count and comments_count to uploads table
ALTER TABLE public.uploads 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Create function to update upload likes count
CREATE OR REPLACE FUNCTION public.update_upload_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.uploads 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.upload_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.uploads 
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.upload_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create function to update upload comments count
CREATE OR REPLACE FUNCTION public.update_upload_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.uploads 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.upload_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.uploads 
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = OLD.upload_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers for upload likes
CREATE TRIGGER update_upload_likes_count_trigger
AFTER INSERT OR DELETE ON public.upload_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_upload_likes_count();

-- Create triggers for upload comments
CREATE TRIGGER update_upload_comments_count_trigger
AFTER INSERT OR DELETE ON public.upload_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_upload_comments_count();