export type OpenMcAccess = "private" | "public-ro" | "public-rw" | "public-rw-listed";

export interface OpenMcSubject {
  id: number;
  name: string;
}

export interface OpenMcModule {
  id: number;
  name: string;
  subject?: OpenMcSubject | null;
}

export interface OpenMcImage {
  id: number;
  path: string;
  comment?: string | null;
  question_id?: number | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface OpenMcAnswer {
  id: number;
  text: string | null;
  hint?: string | null;
  question_id: number;
  is_correct?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface OpenMcQuestionCase {
  id: number;
  title?: string | null;
  description?: string | null;
}

export interface OpenMcQuestion {
  id: number;
  text: string | null;
  hint?: string | null;
  comment?: string | null;
  type?: string | null;
  correct_answer_id?: number | null;
  is_invalid?: boolean;
  needs_review?: boolean;
  case?: OpenMcQuestionCase | null;
  answers?: OpenMcAnswer[];
  images?: OpenMcImage[];
}

export interface OpenMcDeck {
  id: number;
  name: string;
  description?: string | null;
  exam_at?: string | null;
  access?: OpenMcAccess;
  module_id?: number | null;
  module?: OpenMcModule | null;
  questions?: OpenMcQuestion[];
  created_at?: string;
  updated_at?: string;
}

export interface OpenMcPaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

