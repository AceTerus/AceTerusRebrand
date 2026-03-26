-- Seed quiz_categories from existing deck subjects so no quizzes are lost.
-- Uses INSERT ... ON CONFLICT DO NOTHING so re-running is safe.
INSERT INTO quiz_categories (name)
SELECT DISTINCT subject
FROM   decks
WHERE  subject IS NOT NULL
  AND  subject <> ''
ON CONFLICT (name) DO NOTHING;
