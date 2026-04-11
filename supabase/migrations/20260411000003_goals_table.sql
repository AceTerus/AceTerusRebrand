-- ── Goals table ───────────────────────────────────────────────────────────────
CREATE TABLE public.goals (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  date          DATE NOT NULL,                        -- calendar date the goal belongs to
  deadline      TIMESTAMP WITH TIME ZONE,             -- optional hard deadline
  reminder_at   TIMESTAMP WITH TIME ZONE,             -- when to fire the reminder
  reminder_sent BOOLEAN NOT NULL DEFAULT false,       -- has the reminder notification been sent
  priority      TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low', 'medium', 'high')),
  completed     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own goals"
  ON public.goals FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast per-user, per-date queries
CREATE INDEX goals_user_date_idx ON public.goals (user_id, date);
-- Index for reminder polling
CREATE INDEX goals_reminder_idx  ON public.goals (reminder_at, reminder_sent)
  WHERE reminder_at IS NOT NULL AND reminder_sent = false;

-- ── Extend notifications with goal_reminder type ──────────────────────────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'follow', 'like', 'comment',
    'material_like', 'material_comment',
    'quiz_published',
    'streak_milestone', 'streak_broken',
    'goal_reminder'
  ));
