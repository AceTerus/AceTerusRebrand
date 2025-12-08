-- Table to track unread direct messages per sender/receiver pair
CREATE TABLE IF NOT EXISTS public.chat_unread_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  unread_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sender_id)
);

ALTER TABLE public.chat_unread_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their unread counts"
ON public.chat_unread_counts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their unread counts"
ON public.chat_unread_counts
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receiver_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.chat_unread_counts (user_id, sender_id, unread_count)
  VALUES (NEW.receiver_id, NEW.sender_id, 1)
  ON CONFLICT (user_id, sender_id)
  DO UPDATE
  SET unread_count = public.chat_unread_counts.unread_count + 1,
      updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.reset_unread_count(target_user UUID, target_sender UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.chat_unread_counts
  SET unread_count = 0,
      updated_at = now()
  WHERE user_id = target_user
    AND sender_id = target_sender;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER chat_unread_increment_trigger
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.increment_unread_count();

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_unread_counts;

