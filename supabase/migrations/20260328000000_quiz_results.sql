-- Quiz results table: stores per-quiz performance data for AI analysis
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deck_id UUID REFERENCES decks(id) ON DELETE SET NULL,
  deck_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  questions_data JSONB NOT NULL DEFAULT '[]',
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for fast per-user queries
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_completed ON quiz_results (user_id, completed_at DESC);
-- Note: idx_quiz_results_user_category is created in migration 20260328000001 after category column is added

-- Enable RLS
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

-- Users can only read their own results
CREATE POLICY "Users can read own quiz results"
  ON quiz_results FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own results
CREATE POLICY "Users can insert own quiz results"
  ON quiz_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);
