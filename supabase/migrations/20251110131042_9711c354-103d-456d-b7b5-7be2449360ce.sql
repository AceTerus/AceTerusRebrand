-- Add streak tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_quiz_date date;

-- Create table to track quiz completions
CREATE TABLE IF NOT EXISTS public.quiz_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  exam_id text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz_completions
CREATE POLICY "Users can view their own quiz completions"
ON public.quiz_completions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quiz completions"
ON public.quiz_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_quiz_completions_user_date 
ON public.quiz_completions(user_id, completed_at);