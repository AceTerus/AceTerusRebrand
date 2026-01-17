// Supabase Edge Function that proxies OpenMultipleChoice deck/question data
// and normalizes it for AceTerus' quiz UI.
import { serve } from "https://deno.land/std@0.213.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type OpenMCAnswer = {
  id: number;
  text: string;
  hint?: string | null;
};

type OpenMCImage = {
  id: number;
  url?: string | null;
  path?: string | null;
  question_id?: number;
};

type OpenMCQuestion = {
  id: number;
  text: string;
  hint?: string | null;
  comment?: string | null;
  correct_answer_id?: number | null;
  answers?: OpenMCAnswer[];
  images?: OpenMCImage[];
  case?: {
    id: number;
    name?: string | null;
    description?: string | null;
  } | null;
};

type OpenMCDeck = {
  id: number;
  name: string;
  description?: string | null;
  exam_at?: string | null;
  access?: string | null;
  module_id?: number | null;
  module?: {
    id: number;
    name: string;
    subject?: {
      id: number;
      name: string;
    } | null;
  } | null;
  questions?: OpenMCQuestion[];
};

type DeckSummary = {
  id: number;
  name: string;
  description?: string | null;
  access?: string | null;
  moduleName?: string | null;
  subjectName?: string | null;
  examAt?: string | null;
  questionCount: number;
};

type DeckSummaryPayload = {
  decks: DeckSummary[];
};

type NormalizedChoice = {
  id: number;
  text: string;
  hint?: string | null;
  isCorrect: boolean;
};

type NormalizedQuestion = {
  id: number;
  prompt: string;
  hint?: string | null;
  explanation?: string | null;
  case?: {
    id: number;
    name?: string | null;
    description?: string | null;
  } | null;
  correctAnswerId: number | null;
  choices: NormalizedChoice[];
  images: OpenMCImage[];
};

type NormalizedDeckPayload = {
  deck: {
    id: number;
    name: string;
    moduleId: number | null;
    moduleName?: string | null;
    subjectName?: string | null;
  };
  questions: NormalizedQuestion[];
};

type ClientPayload = {
  deckId?: number | string;
  limit?: number | string | null;
  shuffle?: boolean | string;
  listOnly?: boolean | string;
  moduleId?: number | string | null;
  kind?: string | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "Supabase URL or ANON key missing. Auth checks will fail until they are configured."
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await parseClientPayload(req);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return responseWithError(401, "Missing Authorization header");
    }

    const user = await getSupabaseUser(authHeader);
    if (!user) {
      return responseWithError(401, "Unauthorized");
    }

    const listOnly = resolveBoolean(req, "listOnly", payload.listOnly);
    if (listOnly) {
      const moduleId =
        payload.moduleId ?? getQueryParam(req, ["moduleId", "module"]);
      const kind = payload.kind ?? getQueryParam(req, "kind");
      const decks = await fetchOpenMCDeckSummaries({
        moduleId,
        kind,
      });
      return jsonResponse<DeckSummaryPayload>({
        decks: normalizeDeckSummaries(decks),
      });
    }

    const deckId = resolveDeckId(req, payload);
    const questionsLimit = resolveLimit(req, payload);
    const shouldShuffle = resolveBoolean(req, "shuffle", payload.shuffle);

    const openmcPayload = await fetchOpenMCDeck(deckId);

    let normalizedQuestions = normalizeQuestions(openmcPayload.questions ?? []);
    if (shouldShuffle) {
      normalizedQuestions = shuffleQuestions(normalizedQuestions);
    }
    if (questionsLimit) {
      normalizedQuestions = normalizedQuestions.slice(0, questionsLimit);
    }

    const normalized: NormalizedDeckPayload = {
      deck: {
        id: openmcPayload.id,
        name: openmcPayload.name,
        moduleId: openmcPayload.module_id ?? null,
        moduleName: openmcPayload.module?.name ?? null,
        subjectName: openmcPayload.module?.subject?.name ?? null,
      },
      questions: normalizedQuestions,
    };

    return jsonResponse(normalized);
  } catch (error) {
    console.error("openmc-quizzes error:", error);
    return responseWithError(
      error instanceof HttpError ? error.status : 500,
      error instanceof Error ? error.message : "Unexpected error"
    );
  }
});

async function parseClientPayload(req: Request): Promise<ClientPayload> {
  if (req.bodyUsed || !req.body) {
    return {};
  }

  const contentType = req.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  if (!isJson) {
    return {};
  }

  try {
    const body = (await req.json()) as ClientPayload | null;
    if (!body || typeof body !== "object") {
      return {};
    }
    return body;
  } catch {
    return {};
  }
}

function resolveDeckId(req: Request, payload: ClientPayload): string {
  const candidate =
    payload.deckId ??
    getQueryParam(req, ["deckId", "deck_id"]) ??
    Deno.env.get("OPENMC_DEFAULT_DECK_ID");

  if (!candidate) {
    throw new HttpError(400, "deckId parameter is required");
  }

  return String(candidate);
}

function resolveLimit(req: Request, payload: ClientPayload): number | null {
  const candidate = payload.limit ?? getQueryParam(req, "limit");
  if (candidate === undefined || candidate === null || candidate === "") {
    return null;
  }

  const parsed = Number(candidate);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new HttpError(400, "limit must be a positive number");
  }

  return parsed;
}

function resolveBoolean(
  req: Request,
  queryKey: string,
  payloadValue?: boolean | string | null,
): boolean {
  if (typeof payloadValue === "boolean") {
    return payloadValue;
  }

  if (typeof payloadValue === "string") {
    return ["true", "1", "yes"].includes(payloadValue.toLowerCase());
  }

  const url = new URL(req.url);
  const value = url.searchParams.get(queryKey);
  if (!value) {
    return false;
  }

  return ["true", "1", "yes"].includes(value.toLowerCase());
}

function getQueryParam(
  req: Request,
  key: string | string[],
): string | null {
  const url = new URL(req.url);
  if (Array.isArray(key)) {
    for (const k of key) {
      const value = url.searchParams.get(k);
      if (value) {
        return value;
      }
    }
    return null;
  }

  return url.searchParams.get(key);
}

async function getSupabaseUser(authHeader: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new HttpError(
      500,
      "Supabase credentials are not configured for the Edge Function environment."
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Supabase auth error:", error);
    throw new HttpError(401, "Unauthorized");
  }

  return user;
}

async function fetchOpenMCDeck(deckId: string): Promise<OpenMCDeck> {
  const baseUrl = Deno.env.get("OPENMC_BASE_URL");
  const apiToken = Deno.env.get("OPENMC_API_TOKEN");

  if (!baseUrl || !apiToken) {
    throw new HttpError(
      500,
      "OPENMC_BASE_URL and OPENMC_API_TOKEN must be configured."
    );
  }

  const deckUrl = new URL(`/api/decks/${deckId}`, ensureTrailingSlash(baseUrl));
  const openmcResponse = await fetch(deckUrl, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (!openmcResponse.ok) {
    const fallbackMsg = `OpenMultipleChoice request failed with status ${openmcResponse.status}`;
    throw new HttpError(openmcResponse.status, fallbackMsg);
  }

  return (await openmcResponse.json()) as OpenMCDeck;
}

async function fetchOpenMCDeckSummaries(params: {
  moduleId?: string | number | null;
  kind?: string | null;
}): Promise<OpenMCDeck[]> {
  const baseUrl = Deno.env.get("OPENMC_BASE_URL");
  const apiToken = Deno.env.get("OPENMC_API_TOKEN");

  if (!baseUrl || !apiToken) {
    throw new HttpError(
      500,
      "OPENMC_BASE_URL and OPENMC_API_TOKEN must be configured.",
    );
  }

  const deckUrl = new URL("/api/decks", ensureTrailingSlash(baseUrl));

  if (params.moduleId) {
    deckUrl.searchParams.set("module", String(params.moduleId));
  }
  if (params.kind) {
    deckUrl.searchParams.set("kind", params.kind);
  }

  const response = await fetch(deckUrl, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (!response.ok) {
    const fallbackMsg = `OpenMultipleChoice deck listing failed with status ${response.status}`;
    throw new HttpError(response.status, fallbackMsg);
  }

  return (await response.json()) as OpenMCDeck[];
}

function ensureTrailingSlash(input: string): string {
  return input.endsWith("/") ? input : `${input}/`;
}

function normalizeQuestions(
  questions: OpenMCQuestion[],
): NormalizedQuestion[] {
  return questions.map((question) => {
    const choices: NormalizedChoice[] = (question.answers ?? []).map(
      (answer) => ({
        id: answer.id,
        text: answer.text,
        hint: answer.hint ?? null,
        isCorrect: Boolean(
          question.correct_answer_id &&
            answer.id === question.correct_answer_id,
        ),
      }),
    );

    return {
      id: question.id,
      prompt: question.text,
      hint: question.hint ?? null,
      explanation: question.comment ?? null,
      case: question.case ?? null,
      correctAnswerId: question.correct_answer_id ?? null,
      choices,
      images: question.images ?? [],
    };
  });
}

function shuffleQuestions(questions: NormalizedQuestion[]) {
  const copy = [...questions];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeDeckSummaries(decks: OpenMCDeck[]): DeckSummary[] {
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
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

function responseWithError(status: number, message: string) {
  return jsonResponse({ error: message }, status);
}

function jsonResponse<T>(
  data: T,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
