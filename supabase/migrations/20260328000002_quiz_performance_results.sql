-- Dedicated table for AI performance analysis (separate from legacy quiz_results)
CREATE TABLE IF NOT EXISTS quiz_performance_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deck_id UUID REFERENCES decks(id) ON DELETE SET NULL,
  deck_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  questions_data JSONB NOT NULL DEFAULT '[]',
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_qpr_user_id ON quiz_performance_results (user_id);
CREATE INDEX IF NOT EXISTS idx_qpr_user_completed ON quiz_performance_results (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_qpr_user_category ON quiz_performance_results (user_id, category);

ALTER TABLE quiz_performance_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own performance results"
  ON quiz_performance_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own performance results"
  ON quiz_performance_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);
