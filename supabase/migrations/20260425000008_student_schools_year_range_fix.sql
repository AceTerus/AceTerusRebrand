-- Drop unique constraint to allow multiple education entries per user
ALTER TABLE public.student_schools DROP CONSTRAINT IF EXISTS student_schools_user_id_key;

ALTER TABLE public.student_schools
  ADD COLUMN IF NOT EXISTS start_year SMALLINT,
  ADD COLUMN IF NOT EXISTS end_year   SMALLINT,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT false;
