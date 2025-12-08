-- Create chat_messages table for direct user conversations
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent users from sending messages to themselves
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_sender_receiver_check
  CHECK (sender_id <> receiver_id);

-- Helpful indexes for fetching conversations
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_receiver
  ON public.chat_messages (sender_id, receiver_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
  ON public.chat_messages (created_at DESC);

-- Enable row level security
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies to keep conversations private
CREATE POLICY "Users can view their chat messages"
ON public.chat_messages
FOR SELECT
USING (
  auth.uid() = sender_id
  OR auth.uid() = receiver_id
);

CREATE POLICY "Users can send their own chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can delete their own chat messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = sender_id);


