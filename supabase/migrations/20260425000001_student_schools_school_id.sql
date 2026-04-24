-- Link student_schools to the schools reference table
-- school_name stays as a text fallback for schools not in the DB

ALTER TABLE public.student_schools
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  ALTER COLUMN school_name   DROP NOT NULL,
  ALTER COLUMN grade         DROP NOT NULL,
  ALTER COLUMN curricular    DROP NOT NULL,
  ALTER COLUMN school_type   DROP NOT NULL,
  ALTER COLUMN school_location DROP NOT NULL,
  ALTER COLUMN class_name    DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_schools_school_id ON public.student_schools (school_id);

-- Allow other users to view school info (for profile pages)
CREATE POLICY "Public read student school info"
  ON public.student_schools FOR SELECT
  USING (true);
