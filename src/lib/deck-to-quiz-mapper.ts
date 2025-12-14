import type { Deck } from '@/types/openmultiplechoice';

export interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  location: string | null;
  year: number | null;
  questionCount: number;
  duration: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completions: number;
}

/**
 * Map a Deck from openmultiplechoice API to ExamPaper format.
 */
export function mapDeckToExamPaper(deck: Deck): ExamPaper {
  // Extract question count
  const questionCount = Array.isArray(deck.questions) 
    ? deck.questions.length 
    : (deck.questions as any)?.length || 0;

  // Extract subject from module
  const subject = deck.module?.subject?.name 
    || deck.module?.name 
    || 'Unknown';

  // Extract year from exam_at date
  let year: number | null = null;
  if (deck.exam_at) {
    const examDate = new Date(deck.exam_at);
    if (!isNaN(examDate.getTime())) {
      year = examDate.getFullYear();
    }
  }

  // Calculate duration (default to 60 minutes, or estimate based on question count)
  // Assuming ~2 minutes per question
  const duration = questionCount > 0 
    ? Math.max(30, Math.ceil(questionCount * 2)) 
    : 60;

  // Determine difficulty based on question count and other factors
  // This is a simple heuristic - can be enhanced based on actual difficulty data
  let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
  if (questionCount > 50) {
    difficulty = 'Hard';
  } else if (questionCount < 20) {
    difficulty = 'Easy';
  }

  // Get completion count from sessions
  const completions = Array.isArray(deck.sessions) 
    ? deck.sessions.length 
    : 0;

  // Extract location from description or module name
  const location = deck.description 
    || deck.module?.name 
    || null;

  return {
    id: deck.id.toString(),
    title: deck.name,
    subject,
    location,
    year,
    questionCount,
    duration,
    difficulty,
    completions,
  };
}

/**
 * Map an array of Decks to ExamPapers.
 */
export function mapDecksToExamPapers(decks: Deck[]): ExamPaper[] {
  return decks.map(mapDeckToExamPaper);
}




