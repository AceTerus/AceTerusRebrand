import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type {
  OpenMcDeck,
  OpenMcDeckSummary,
  OpenMcQuizPayload,
  OpenMcQuizQuestion,
} from "@/types/openmc";

const API_BASE_URL = import.meta.env.VITE_OPENMC_API_URL?.replace(/\/$/, "") ?? "";
const ASSET_BASE_URL =
  import.meta.env.VITE_OPENMC_ASSET_BASE_URL?.replace(/\/$/, "") ??
  API_BASE_URL ??
  "";

const SANCTUM_TOKEN_KEY = "openmc:sanctum-token";
const EXCHANGE_PATH = "/api/supabase/exchange-token";
const isBrowser = typeof window !== "undefined";
let cachedSanctumToken = isBrowser ? localStorage.getItem(SANCTUM_TOKEN_KEY) : null;
let ongoingExchange: Promise<string | null> | null = null;

export class OpenMcClientError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "OpenMcClientError";
    this.status = status;
    this.details = details;
  }
}

export type DeckListParams = {
  moduleId?: number;
  kind?: "public" | "user" | "public-rw-listed" | "bookmarked";
};

export type QuizRequestParams = {
  deckId?: number;
  limit?: number;
  shuffle?: boolean;
};

export const syncOpenMcTokenFromSession = async (
  session: Session | null
): Promise<string | null> => {
  if (!session?.access_token) {
    storeSanctumToken(null);
    return null;
  }

  if (!ongoingExchange) {
    ongoingExchange = exchangeSupabaseToken(session.access_token).finally(() => {
      ongoingExchange = null;
    });
  }

  return ongoingExchange;
};

export const clearOpenMcToken = () => {
  storeSanctumToken(null);
};

export const fetchOpenMcDeckSummaries = async (
  params?: DeckListParams
): Promise<OpenMcDeckSummary[]> => {
  const query = new URLSearchParams();
  if (params?.moduleId !== undefined) {
    query.set("module", String(params.moduleId));
  }
  if (params?.kind) {
    query.set("kind", params.kind);
  }

  const decks = await authorizedFetch<OpenMcDeck[]>(
    `/api/decks${query.toString() ? `?${query.toString()}` : ""}`
  );

  return decks.map((deck) => ({
    id: deck.id,
    name: deck.name,
    description: deck.description ?? null,
    access: deck.access ?? null,
    moduleName: deck.module?.name ?? null,
    subjectName: deck.module?.subject?.name ?? null,
    examAt: deck.exam_at ?? null,
    questionCount: deck.questions?.length ?? 0,
  }));
};

export const fetchOpenMcQuiz = async (
  params?: QuizRequestParams
): Promise<OpenMcQuizPayload> => {
  if (params?.deckId === undefined) {
    throw new OpenMcClientError("deckId parameter is required", 400);
  }

  const deck = await authorizedFetch<OpenMcDeck>(`/api/decks/${params.deckId}`);

  let questions: OpenMcQuizQuestion[] = normalizeQuestions(deck.questions ?? []);
  if (params?.shuffle) {
    questions = shuffleQuestions(questions);
  }
  if (params?.limit !== undefined && params.limit > 0) {
    questions = questions.slice(0, params.limit);
  }

  return {
    deck: {
      id: deck.id,
      name: deck.name,
      moduleId: deck.module_id ?? null,
      moduleName: deck.module?.name ?? null,
      subjectName: deck.module?.subject?.name ?? null,
    },
    questions,
  };
};

export const buildOpenMcImageUrl = (imagePath?: string | null, imageUrl?: string | null) => {
  // If a full URL is provided (external or absolute), use it directly
  if (imageUrl && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))) {
    return imageUrl;
  }

  // If path is provided, build URL from ASSET_BASE_URL
  if (!ASSET_BASE_URL || !imagePath) {
    return imageUrl || null;
  }

  // Use the path directly from the API (format: images/filename.jpg)
  // The Laravel fallback route serves files from storage using Storage::path()
  const normalized = imagePath.replace(/^\/+/, "");

  return `${ASSET_BASE_URL}/${normalized}`.replace(/([^:]\/)\/+/g, "$1");
};

const getApiBaseUrl = () => {
  if (!API_BASE_URL) {
    throw new OpenMcClientError("OpenMultipleChoice API URL is not configured.", 500);
  }
  return API_BASE_URL;
};

const authorizedFetch = async <T>(
  path: string,
  init?: RequestInit,
  allowRetry = true
): Promise<T> => {
  const baseUrl = getApiBaseUrl();
  const token = await ensureSanctumToken();
  const headers = new Headers(init?.headers ?? {});

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${baseUrl}${normalizePath(path)}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && allowRetry) {
    storeSanctumToken(null);
    await refreshTokenFromCurrentSession();
    return authorizedFetch<T>(path, init, false);
  }

  if (!response.ok) {
    const message =
      (await response.text().catch(() => null)) ??
      `OpenMultipleChoice request failed with status ${response.status}`;
    throw new OpenMcClientError(message, response.status);
  }

  return (await response.json()) as T;
};

const ensureSanctumToken = async (): Promise<string> => {
  if (cachedSanctumToken) {
    return cachedSanctumToken;
  }

  const nextToken = await refreshTokenFromCurrentSession();
  if (!nextToken) {
    throw new OpenMcClientError("You must sign in to access OpenMultipleChoice.", 401);
  }

  return nextToken;
};

const refreshTokenFromCurrentSession = async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return syncOpenMcTokenFromSession(session);
};

const exchangeSupabaseToken = async (accessToken: string): Promise<string> => {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${EXCHANGE_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const message =
      (await response.text().catch(() => null)) ??
      `Failed to exchange Supabase token (status ${response.status}).`;
    throw new OpenMcClientError(message, response.status);
  }

  const data = (await response.json()) as { token: string };
  storeSanctumToken(data.token);
  return data.token;
};

const storeSanctumToken = (token: string | null) => {
  cachedSanctumToken = token ?? null;
  if (!isBrowser) {
    return;
  }

  if (token) {
    localStorage.setItem(SANCTUM_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(SANCTUM_TOKEN_KEY);
  }
};

const normalizeQuestions = (questions: OpenMcDeck["questions"]): OpenMcQuizQuestion[] => {
  return (questions ?? []).map((question) => ({
    id: question.id,
    prompt: question.text,
    hint: question.hint ?? null,
    explanation: question.comment ?? null,
    case: question.case ?? null,
    correctAnswerId: question.correct_answer_id ?? null,
    choices: (question.answers ?? []).map((answer) => ({
      id: answer.id,
      text: answer.text ?? "",
      hint: answer.hint ?? null,
      isCorrect: Boolean(
        question.correct_answer_id && answer.id === question.correct_answer_id
      ),
    })),
    images: question.images ?? [],
  }));
};

const shuffleQuestions = (questions: OpenMcQuizQuestion[]) => {
  const copy = [...questions];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const normalizePath = (path: string) => (path.startsWith("/") ? path : `/${path}`);

