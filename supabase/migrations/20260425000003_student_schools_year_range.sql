-- Add optional year range to education entries
ALTER TABLE public.student_schools
  ADD COLUMN IF NOT EXISTS start_year SMALLINT,
  ADD COLUMN IF NOT EXISTS end_year   SMALLINT;
