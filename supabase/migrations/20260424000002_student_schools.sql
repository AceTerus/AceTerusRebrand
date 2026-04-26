-- Student school information table
CREATE TABLE IF NOT EXISTS public.student_schools (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name     TEXT        NOT NULL,
  grade           TEXT        NOT NULL,  -- e.g. 'Form 1', 'Form 5', 'Year 6'
  curricular      TEXT        NOT NULL,  -- e.g. 'Science', 'Accounting', 'Arts'
  school_type     TEXT        NOT NULL,  -- e.g. 'SMK', 'SMJK', 'SJK', 'Private', 'International'
  school_location TEXT        NOT NULL,
  class_name      TEXT        NOT NULL,  -- e.g. '5 Amanah', '4 Science 1'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_schools_user_id ON public.student_schools (user_id);

ALTER TABLE public.student_schools ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_schools' AND policyname = 'Users can view their own school info') THEN
    CREATE POLICY "Users can view their own school info"
      ON public.student_schools FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_schools' AND policyname = 'Users can insert their own school info') THEN
    CREATE POLICY "Users can insert their own school info"
      ON public.student_schools FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_schools' AND policyname = 'Users can update their own school info') THEN
    CREATE POLICY "Users can update their own school info"
      ON public.student_schools FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_schools' AND policyname = 'Users can delete their own school info') THEN
    CREATE POLICY "Users can delete their own school info"
      ON public.student_schools FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_student_schools_updated_at') THEN
    CREATE TRIGGER update_student_schools_updated_at
      BEFORE UPDATE ON public.student_schools
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
