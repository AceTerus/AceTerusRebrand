import { supabase } from "@/integrations/supabase/client";
import type { Deck, Question, QuizPayload } from "@/types/quiz";

export const fetchDecks = async (): Promise<Deck[]> => {
  const { data, error } = await supabase
    .from("decks")
    .select("id, name, description, subject, created_by, created_at, questions(id)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((deck: any) => ({
    id: deck.id,
    name: deck.name,
    description: deck.description ?? null,
    subject: deck.subject ?? null,
    created_by: deck.created_by ?? null,
    created_at: deck.created_at,
    question_count: Array.isArray(deck.questions) ? deck.questions.length : 0,
  }));
};

export const fetchQuiz = async (deckId: string): Promise<QuizPayload> => {
  const { data, error } = await supabase
    .from("decks")
    .select("*, questions(*, answers(*))")
    .eq("id", deckId)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Deck not found");

  const questions: Question[] = ((data as any).questions ?? []).map((q: any) => ({
    id: q.id,
    deck_id: q.deck_id,
    text: q.text,
    explanation: q.explanation ?? null,
    order: q.order ?? 0,
    answers: (q.answers ?? []).sort(() => Math.random() - 0.5),
  }));

  return {
    deck: {
      id: data.id,
      name: data.name,
      description: (data as any).description ?? null,
      subject: (data as any).subject ?? null,
      created_by: (data as any).created_by ?? null,
      created_at: data.created_at,
      question_count: questions.length,
    },
    questions,
  };
};

// ── Admin functions ────────────────────────────────────────────────────────────

export const createDeck = async (deck: {
  name: string;
  description?: string;
  subject?: string;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("decks")
    .insert([{ ...deck, created_by: user?.id }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateDeck = async (
  id: string,
  deck: { name?: string; description?: string; subject?: string }
) => {
  const { data, error } = await supabase
    .from("decks")
    .update(deck)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteDeck = async (id: string) => {
  const { error } = await supabase.from("decks").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const fetchQuestionsForDeck = async (deckId: string): Promise<Question[]> => {
  const { data, error } = await supabase
    .from("questions")
    .select("*, answers(*)")
    .eq("deck_id", deckId)
    .order("order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((q: any) => ({
    ...q,
    answers: q.answers ?? [],
  }));
};

export const createQuestion = async (question: {
  deck_id: string;
  text: string;
  explanation?: string;
  order?: number;
  answers: { text: string; is_correct: boolean }[];
}) => {
  const { answers, ...questionData } = question;
  const { data: q, error: qError } = await supabase
    .from("questions")
    .insert([questionData])
    .select()
    .single();
  if (qError) throw new Error(qError.message);

  const { error: aError } = await supabase
    .from("answers")
    .insert(answers.map((a) => ({ ...a, question_id: q.id })));
  if (aError) throw new Error(aError.message);

  return q;
};

export const updateQuestion = async (
  id: string,
  data: { text?: string; explanation?: string }
) => {
  const { error } = await supabase.from("questions").update(data).eq("id", id);
  if (error) throw new Error(error.message);
};

export const replaceAnswers = async (
  questionId: string,
  answers: { text: string; is_correct: boolean }[]
) => {
  const { error: delError } = await supabase
    .from("answers")
    .delete()
    .eq("question_id", questionId);
  if (delError) throw new Error(delError.message);

  const { error } = await supabase
    .from("answers")
    .insert(answers.map((a) => ({ ...a, question_id: questionId })));
  if (error) throw new Error(error.message);
};

export const deleteQuestion = async (id: string) => {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw new Error(error.message);
};
