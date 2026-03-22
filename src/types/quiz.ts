export interface Deck {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  created_by: string | null;
  created_at: string;
  question_count: number;
  is_published: boolean;
}

export interface Answer {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
}

export interface Question {
  id: string;
  deck_id: string;
  text: string;
  explanation: string | null;
  image_url: string | null;
  order: number;
  answers: Answer[];
}

export interface QuizPayload {
  deck: Deck;
  questions: Question[];
}
