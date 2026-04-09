-- Add quiz_type to decks table (objective = MCQ, subjective = open-ended/SPM style)
ALTER TABLE decks ADD COLUMN IF NOT EXISTS quiz_type text NOT NULL DEFAULT 'objective';

-- Add marks to questions table (used for subjective questions to indicate question value)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS marks integer;
