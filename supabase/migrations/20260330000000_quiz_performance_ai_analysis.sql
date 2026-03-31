-- Add AI analysis column to quiz_performance_results
ALTER TABLE quiz_performance_results
  ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- Allow users to update their own rows (needed for saving AI analysis)
CREATE POLICY "Users can update own performance results"
  ON quiz_performance_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
