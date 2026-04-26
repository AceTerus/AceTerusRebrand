-- Track which education entry the user is currently enrolled in
ALTER TABLE public.student_schools
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT false;
