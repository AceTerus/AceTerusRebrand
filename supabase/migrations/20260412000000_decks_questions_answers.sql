-- Create decks table (quiz content organized into decks/categories)
CREATE TABLE IF NOT EXISTS public.decks (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  subject     TEXT,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN    NOT NULL DEFAULT false,
  quiz_type   TEXT        NOT NULL DEFAULT 'objective',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decks_subject     ON public.decks (subject);
CREATE INDEX IF NOT EXISTS idx_decks_is_published ON public.decks (is_published);

ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read decks"
  ON public.decks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert decks"
  ON public.decks FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Admins can update decks"
  ON public.decks FOR UPDATE TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Admins can delete decks"
  ON public.decks FOR DELETE TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

-- Create questions table (deck-based, supports both objective and subjective)
CREATE TABLE IF NOT EXISTS public.questions (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deck_id     UUID        NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  text        TEXT        NOT NULL,
  explanation TEXT,
  image_url   TEXT,
  "order"     INTEGER     NOT NULL DEFAULT 0,
  marks       INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_deck_id ON public.questions (deck_id);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read questions"
  ON public.questions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert questions"
  ON public.questions FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Admins can update questions"
  ON public.questions FOR UPDATE TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Admins can delete questions"
  ON public.questions FOR DELETE TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

-- Create answers table (options for each question)
CREATE TABLE IF NOT EXISTS public.answers (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID        NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  text        TEXT        NOT NULL,
  is_correct  BOOLEAN     NOT NULL DEFAULT false,
  image_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_answers_question_id ON public.answers (question_id);

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read answers"
  ON public.answers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert answers"
  ON public.answers FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Admins can update answers"
  ON public.answers FOR UPDATE TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);

CREATE POLICY "Admins can delete answers"
  ON public.answers FOR DELETE TO authenticated
  USING ((SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) = true);
