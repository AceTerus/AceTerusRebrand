-- Enable RLS on decks, questions, and answers.
-- Drop all known existing policies by exact name, then recreate correctly.

-- ── decks ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view decks"        ON public.decks;
DROP POLICY IF EXISTS "Users see published decks, admins see all" ON public.decks;
DROP POLICY IF EXISTS "Admins can insert decks"                   ON public.decks;
DROP POLICY IF EXISTS "Admins can update decks"                   ON public.decks;
DROP POLICY IF EXISTS "Admins can delete decks"                   ON public.decks;
DROP POLICY IF EXISTS "Authenticated users can read decks"        ON public.decks;

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

-- ── questions ─────────────────────────────────────────────────────────────────

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read questions"               ON public.questions;
DROP POLICY IF EXISTS "Admins can insert questions"             ON public.questions;
DROP POLICY IF EXISTS "Admins can update questions"             ON public.questions;
DROP POLICY IF EXISTS "Admins can delete questions"             ON public.questions;
DROP POLICY IF EXISTS "Authenticated users can read questions"  ON public.questions;

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

-- ── answers ───────────────────────────────────────────────────────────────────

ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view answers"  ON public.answers;
DROP POLICY IF EXISTS "Admins can insert answers"             ON public.answers;
DROP POLICY IF EXISTS "Admins can update answers"             ON public.answers;
DROP POLICY IF EXISTS "Admins can delete answers"             ON public.answers;
DROP POLICY IF EXISTS "Authenticated users can read answers"  ON public.answers;

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
