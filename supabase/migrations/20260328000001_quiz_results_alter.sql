-- Ensure quiz_results table has all required columns for AI analysis feature
-- Add columns if they don't exist (safe to re-run)

ALTER TABLE quiz_results
  ADD COLUMN IF NOT EXISTS deck_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS score NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correct_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wrong_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skipped_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS questions_data JSONB NOT NULL DEFAULT '[]';

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_completed ON quiz_results (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_category ON quiz_results (user_id, category);

-- Ensure RLS policies exist
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_results'
      AND policyname = 'Users can read own quiz results'
  ) THEN
    CREATE POLICY "Users can read own quiz results"
      ON quiz_results FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quiz_results'
      AND policyname = 'Users can insert own quiz results'
  ) THEN
    CREATE POLICY "Users can insert own quiz results"
      ON quiz_results FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
