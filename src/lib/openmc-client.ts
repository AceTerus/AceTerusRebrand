import type { OpenMcDeck, OpenMcPaginatedResponse, OpenMcQuestion } from "@/types/openmc";

const RAW_BASE_URL = import.meta.env.VITE_OPENMC_API_URL?.replace(/\/$/, "") ?? "";
const API_ROOT = RAW_BASE_URL ? `${RAW_BASE_URL}/api` : "";
const OPENMC_TOKEN = import.meta.env.VITE_OPENMC_API_TOKEN?.trim() ?? "";

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

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  headers?: HeadersInit;
};

const assertConfigured = () => {
  if (!RAW_BASE_URL) {
    throw new OpenMcClientError(
      "Missing VITE_OPENMC_API_URL. Set it in your environment to enable quizzes.",
      500
    );
  }
};

const buildApiUrl = (path: string, query?: RequestOptions["query"]) => {
  assertConfigured();
  const url = new URL(`${API_ROOT}${path.startsWith("/") ? path : `/${path}`}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

const request = async <T>(path: string, options?: RequestOptions): Promise<T> => {
  const url = buildApiUrl(path, options?.query);
  const headers: HeadersInit = {
    Accept: "application/json",
    ...(options?.headers ?? {}),
  };

  if (OPENMC_TOKEN) {
    headers.Authorization = `Bearer ${OPENMC_TOKEN}`;
  }

  let body: BodyInit | undefined;
  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    method: options?.method ?? "GET",
    headers,
    body,
    signal: options?.signal,
    credentials: OPENMC_TOKEN ? "omit" : "include",
  });

  if (!response.ok) {
    let details: unknown;
    try {
      details = await response.json();
    } catch {
      // ignore JSON parsing failures
    }

    const message =
      (typeof details === "object" && details && "message" in details
        ? (details as { message?: string }).message
        : undefined) ?? `OpenMC request failed (${response.status})`;

    throw new OpenMcClientError(message, response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export interface ListDecksParams {
  module?: number;
  kind?: "public" | "user" | "public-rw-listed" | "bookmarked";
}

export const fetchOpenMcDecks = (params?: ListDecksParams, signal?: AbortSignal) =>
  request<OpenMcDeck[]>("/decks", { query: params, signal });

export const fetchOpenMcDeckWithQuestions = (deckId: number, signal?: AbortSignal) =>
  request<OpenMcDeck>(`/decks/${deckId}`, { signal });

export const fetchOpenMcQuestion = (questionId: number, signal?: AbortSignal) =>
  request<OpenMcQuestion>(`/questions/${questionId}`, { signal });

export const fetchOpenMcPaginatedQuestions = (signal?: AbortSignal) =>
  request<OpenMcPaginatedResponse<OpenMcQuestion>>("/questions", { signal });

export const buildOpenMcImageUrl = (imagePath?: string | null) => {
  if (!RAW_BASE_URL || !imagePath) {
    return null;
  }

  const sanitizedPath = imagePath.startsWith("storage/") ? imagePath : `storage/${imagePath}`;
  const normalized = sanitizedPath.replace(/^\/+/, "");

  return `${RAW_BASE_URL}/${normalized}`.replace(/([^:]\/)\/+/g, "$1");
};

export const isOpenMcConfigured = () => Boolean(RAW_BASE_URL);

