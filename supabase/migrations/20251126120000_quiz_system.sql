-- Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  location TEXT,
  year INTEGER,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 60, -- in minutes
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')) DEFAULT 'Medium',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')) DEFAULT 'multiple_choice',
  correct_answer TEXT NOT NULL, -- For multiple_choice: option index (0,1,2,3), for true_false: 'true'/'false', for short_answer: the answer text
  points INTEGER DEFAULT 1,
  position INTEGER DEFAULT 0, -- Order of question in quiz
  explanation TEXT, -- Explanation shown after answering
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create question_options table for multiple choice questions
CREATE TABLE IF NOT EXISTS public.question_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_index INTEGER NOT NULL, -- 0, 1, 2, 3, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, option_index)
);

-- Create quiz_results table to store user quiz attempts
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  time_taken INTEGER, -- in seconds
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  answers JSONB, -- Store user answers: { question_id: answer }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create quiz_answers table to store individual question answers
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  result_id UUID NOT NULL REFERENCES public.quiz_results(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quizzes
CREATE POLICY "Everyone can view quizzes"
ON public.quizzes
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create quizzes"
ON public.quizzes
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own quizzes"
ON public.quizzes
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own quizzes"
ON public.quizzes
FOR DELETE
USING (auth.uid() = created_by);

-- RLS Policies for questions
CREATE POLICY "Everyone can view questions"
ON public.questions
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create questions"
ON public.questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = questions.quiz_id
      AND quizzes.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update questions for their quizzes"
ON public.questions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = questions.quiz_id
      AND quizzes.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete questions for their quizzes"
ON public.questions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = questions.quiz_id
      AND quizzes.created_by = auth.uid()
  )
);

-- RLS Policies for question_options
CREATE POLICY "Everyone can view question options"
ON public.question_options
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create question options"
ON public.question_options
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.quizzes z ON q.quiz_id = z.id
    WHERE q.id = question_options.question_id
      AND z.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update question options for their quizzes"
ON public.question_options
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.quizzes z ON q.quiz_id = z.id
    WHERE q.id = question_options.question_id
      AND z.created_by = auth.uid()
  )
);

CREATE POLICY "Users can delete question options for their quizzes"
ON public.question_options
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.quizzes z ON q.quiz_id = z.id
    WHERE q.id = question_options.question_id
      AND z.created_by = auth.uid()
  )
);

-- RLS Policies for quiz_results
CREATE POLICY "Users can view their own quiz results"
ON public.quiz_results
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quiz results"
ON public.quiz_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quiz results"
ON public.quiz_results
FOR UPDATE
USING (auth.uid() = user_id);

-- RLS Policies for quiz_answers
CREATE POLICY "Users can view their own quiz answers"
ON public.quiz_answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_results
    WHERE quiz_results.id = quiz_answers.result_id
      AND quiz_results.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own quiz answers"
ON public.quiz_answers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_results
    WHERE quiz_results.id = quiz_answers.result_id
      AND quiz_results.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON public.question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON public.quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON public.quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_result_id ON public.quiz_answers(result_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON public.quiz_answers(question_id);

-- Function to update quiz updated_at timestamp
CREATE OR REPLACE FUNCTION update_quiz_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.quizzes
  SET updated_at = now()
  WHERE id = NEW.quiz_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quiz updated_at when questions change
CREATE TRIGGER update_quiz_on_question_change
AFTER INSERT OR UPDATE OR DELETE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION update_quiz_updated_at();

-- Function to count questions in a quiz
CREATE OR REPLACE FUNCTION get_quiz_question_count(quiz_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.questions WHERE quiz_id = quiz_uuid);
END;
$$ LANGUAGE plpgsql;

-- Function to count quiz completions
CREATE OR REPLACE FUNCTION get_quiz_completion_count(quiz_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM public.quiz_results WHERE quiz_id = quiz_uuid);
END;
$$ LANGUAGE plpgsql;

