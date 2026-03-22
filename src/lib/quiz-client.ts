import { supabase } from "@/integrations/supabase/client";
import type { Deck, Question, QuizPayload } from "@/types/quiz";

export const uploadQuizImage = async (file: File): Promise<string> => {
  const ext = file.name.split(".").pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("quiz-images").upload(path, file);
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("quiz-images").getPublicUrl(path);
  return data.publicUrl;
};

export const deleteQuizImage = async (url: string) => {
  const path = url.split("/quiz-images/")[1];
  if (!path) return;
  await supabase.storage.from("quiz-images").remove([path]);
};

export const fetchDecks = async (): Promise<Deck[]> => {
  const { data: deckRows, error: deckError } = await supabase
    .from("decks")
    .select("id, name, description, subject, created_by, created_at, is_published")
    .order("created_at", { ascending: false });

  if (deckError) throw new Error(deckError.message);
  if (!deckRows?.length) return [];

  const deckIds = deckRows.map((d: any) => d.id);
  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, deck_id")
    .in("deck_id", deckIds);

  const countMap: Record<string, number> = {};
  for (const q of questionRows ?? []) {
    countMap[(q as any).deck_id] = (countMap[(q as any).deck_id] ?? 0) + 1;
  }

  return deckRows.map((deck: any) => ({
    id: deck.id,
    name: deck.name,
    description: deck.description ?? null,
    subject: deck.subject ?? null,
    created_by: deck.created_by ?? null,
    created_at: deck.created_at,
    question_count: countMap[deck.id] ?? 0,
    is_published: deck.is_published ?? false,
  }));
};

export const fetchQuiz = async (deckId: string): Promise<QuizPayload> => {
  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select("id, name, description, subject, created_by, created_at, is_published")
    .eq("id", deckId)
    .single();

  if (deckError) throw new Error(deckError.message);
  if (!deck) throw new Error("Deck not found");

  const { data: questionRows, error: qError } = await supabase
    .from("questions")
    .select("id, deck_id, text, explanation, image_url, order")
    .eq("deck_id", deckId)
    .order("order", { ascending: true });

  if (qError) throw new Error(qError.message);

  const questionIds = (questionRows ?? []).map((q: any) => q.id);
  let answerRows: any[] = [];

  if (questionIds.length > 0) {
    const { data: aRows, error: aError } = await supabase
      .from("answers")
      .select("id, question_id, text, is_correct")
      .in("question_id", questionIds);
    if (aError) throw new Error(aError.message);
    answerRows = aRows ?? [];
  }

  const answersByQuestion: Record<string, any[]> = {};
  for (const a of answerRows) {
    if (!answersByQuestion[a.question_id]) answersByQuestion[a.question_id] = [];
    answersByQuestion[a.question_id].push(a);
  }

  const questions: Question[] = (questionRows ?? []).map((q: any) => ({
    id: q.id,
    deck_id: q.deck_id,
    text: q.text,
    explanation: q.explanation ?? null,
    image_url: q.image_url ?? null,
    order: q.order ?? 0,
    answers: (answersByQuestion[q.id] ?? []).sort(() => Math.random() - 0.5),
  }));

  return {
    deck: {
      id: (deck as any).id,
      name: (deck as any).name,
      description: (deck as any).description ?? null,
      subject: (deck as any).subject ?? null,
      created_by: (deck as any).created_by ?? null,
      created_at: (deck as any).created_at,
      question_count: questions.length,
      is_published: (deck as any).is_published ?? false,
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

export const toggleDeckPublished = async (id: string, isPublished: boolean) => {
  const { error } = await supabase
    .from("decks")
    .update({ is_published: isPublished })
    .eq("id", id);
  if (error) throw new Error(error.message);
};

export const deleteDeck = async (id: string) => {
  const { error } = await supabase.from("decks").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

export const fetchQuestionsForDeck = async (deckId: string): Promise<Question[]> => {
  const { data: questionRows, error: qError } = await supabase
    .from("questions")
    .select("id, deck_id, text, explanation, image_url, order")
    .eq("deck_id", deckId)
    .order("order", { ascending: true });
  if (qError) throw new Error(qError.message);

  const questionIds = (questionRows ?? []).map((q: any) => q.id);
  let answerRows: any[] = [];

  if (questionIds.length > 0) {
    const { data: aRows, error: aError } = await supabase
      .from("answers")
      .select("id, question_id, text, is_correct")
      .in("question_id", questionIds);
    if (aError) throw new Error(aError.message);
    answerRows = aRows ?? [];
  }

  const answersByQuestion: Record<string, any[]> = {};
  for (const a of answerRows) {
    if (!answersByQuestion[a.question_id]) answersByQuestion[a.question_id] = [];
    answersByQuestion[a.question_id].push(a);
  }

  return (questionRows ?? []).map((q: any) => ({
    id: q.id,
    deck_id: q.deck_id,
    text: q.text,
    explanation: q.explanation ?? null,
    image_url: q.image_url ?? null,
    order: q.order ?? 0,
    answers: answersByQuestion[q.id] ?? [],
  }));
};

export const createQuestion = async (question: {
  deck_id: string;
  text: string;
  explanation?: string;
  image_url?: string;
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
  data: { text?: string; explanation?: string; image_url?: string | null }
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
