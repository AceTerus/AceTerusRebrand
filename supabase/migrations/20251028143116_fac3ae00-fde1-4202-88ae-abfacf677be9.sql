-- Function to update follower counts when a follow is created
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Increment followers_count for the followed user
  UPDATE public.profiles
  SET followers_count = followers_count + 1
  WHERE user_id = NEW.followed_id;
  
  -- Increment following_count for the follower
  UPDATE public.profiles
  SET following_count = following_count + 1
  WHERE user_id = NEW.follower_id;
  
  RETURN NEW;
END;
$$;

-- Function to update follower counts when a follow is deleted
CREATE OR REPLACE FUNCTION public.handle_delete_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Decrement followers_count for the followed user
  UPDATE public.profiles
  SET followers_count = GREATEST(followers_count - 1, 0)
  WHERE user_id = OLD.followed_id;
  
  -- Decrement following_count for the follower
  UPDATE public.profiles
  SET following_count = GREATEST(following_count - 1, 0)
  WHERE user_id = OLD.follower_id;
  
  RETURN OLD;
END;
$$;

-- Trigger for when a follow is created
CREATE TRIGGER on_follow_created
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_follow();

-- Trigger for when a follow is deleted
CREATE TRIGGER on_follow_deleted
  AFTER DELETE ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_delete_follow();