import { supabase } from "@/integrations/supabase/client";
import type { Category, Deck, Question, QuizPayload } from "@/types/quiz";

// ── Category functions ─────────────────────────────────────────────────────────

export const fetchCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from("quiz_categories")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const createCategory = async (category: {
  name: string;
  description?: string;
}): Promise<Category> => {
  const { data, error } = await supabase
    .from("quiz_categories")
    .insert([category])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateCategory = async (
  id: string,
  category: { name?: string; description?: string },
  oldName?: string
): Promise<Category> => {
  const { data, error } = await supabase
    .from("quiz_categories")
    .update(category)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Keep decks in sync when the category name changes
  if (category.name && oldName && category.name !== oldName) {
    const { error: deckError } = await supabase
      .from("decks")
      .update({ subject: category.name })
      .eq("subject", oldName);
    if (deckError) throw new Error(deckError.message);
  }

  return data;
};

export const toggleCategoryPublished = async (id: string, isPublished: boolean) => {
  // Fetch category name before updating (needed for notification metadata)
  const { data: category } = await supabase
    .from("quiz_categories")
    .select("name")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("quiz_categories")
    .update({ is_published: isPublished })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Fan-out notification to all users when publishing (not unpublishing)
  if (isPublished && category) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await (supabase as any).rpc("notify_quiz_published", {
        p_category_id: id,
        p_admin_id: user.id,
        p_category_name: category.name,
      });
    }
  }
};

export const deleteCategory = async (id: string) => {
  const { error } = await supabase.from("quiz_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

const generateId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export const uploadQuizImage = async (file: File): Promise<string> => {
  const ext = file.name.split(".").pop();
  const path = `${generateId()}.${ext}`;
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

export const fetchDecks = async (publishedOnly = false): Promise<Deck[]> => {
  let query = supabase
    .from("decks")
    .select("id, name, description, subject, created_by, created_at, is_published, quiz_type")
    .order("created_at", { ascending: false });

  if (publishedOnly) query = query.eq("is_published", true);

  const { data: deckRows, error: deckError } = await query;

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
    quiz_type: (deck.quiz_type ?? "objective") as "objective" | "subjective",
  }));
};

export const fetchQuiz = async (deckId: string): Promise<QuizPayload> => {
  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select("id, name, description, subject, created_by, created_at, is_published, quiz_type")
    .eq("id", deckId)
    .single();

  if (deckError) throw new Error(deckError.message);
  if (!deck) throw new Error("Deck not found");

  const { data: questionRows, error: qError } = await supabase
    .from("questions")
    .select("id, deck_id, text, explanation, image_url, order, marks")
    .eq("deck_id", deckId)
    .order("order", { ascending: true });

  if (qError) throw new Error(qError.message);

  const questionIds = (questionRows ?? []).map((q: any) => q.id);
  let answerRows: any[] = [];

  if (questionIds.length > 0) {
    const { data: aRows, error: aError } = await supabase
      .from("answers")
      .select("id, question_id, text, is_correct, image_url")
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
    marks: q.marks ?? null,
    answers: (answersByQuestion[q.id] ?? []).sort(() => Math.random() - 0.5).map((a: any) => ({
      id: a.id,
      question_id: a.question_id,
      text: a.text,
      is_correct: a.is_correct,
      image_url: a.image_url ?? null,
    })),
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
      quiz_type: ((deck as any).quiz_type ?? "objective") as "objective" | "subjective",
    },
    questions,
  };
};

// ── Admin functions ────────────────────────────────────────────────────────────

export const createDeck = async (deck: {
  name: string;
  description?: string;
  subject?: string;
  quiz_type?: string;
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
    .select("id, deck_id, text, explanation, image_url, order, marks")
    .eq("deck_id", deckId)
    .order("order", { ascending: true });
  if (qError) throw new Error(qError.message);

  const questionIds = (questionRows ?? []).map((q: any) => q.id);
  let answerRows: any[] = [];

  if (questionIds.length > 0) {
    const { data: aRows, error: aError } = await supabase
      .from("answers")
      .select("id, question_id, text, is_correct, image_url")
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
    marks: q.marks ?? null,
    answers: (answersByQuestion[q.id] ?? []).map((a: any) => ({
      id: a.id,
      question_id: a.question_id,
      text: a.text,
      is_correct: a.is_correct,
      image_url: a.image_url ?? null,
    })),
  }));
};

export const createQuestion = async (question: {
  deck_id: string;
  text: string;
  explanation?: string;
  image_url?: string;
  order?: number;
  marks?: number;
  answers: { text: string; is_correct: boolean; image_url?: string | null }[];
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
  data: { text?: string; explanation?: string; image_url?: string | null; marks?: number }
) => {
  const { error } = await supabase.from("questions").update(data).eq("id", id);
  if (error) throw new Error(error.message);
};

export const replaceAnswers = async (
  questionId: string,
  answers: { text: string; is_correct: boolean; image_url?: string | null }[]
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
