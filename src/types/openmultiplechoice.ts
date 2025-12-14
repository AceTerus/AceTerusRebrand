/**
 * TypeScript type definitions for OpenMultipleChoice API
 */

export interface Module {
  id: number;
  name: string;
  subject_id?: number;
  subject?: Subject;
  created_at?: string;
  updated_at?: string;
}

export interface Subject {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface Answer {
  id: number;
  question_id: number;
  text: string;
  answer_percentage?: number;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionImage {
  id: number;
  question_id: number;
  image_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionCase {
  id: number;
  case_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Question {
  id: number;
  text: string;
  hint?: string;
  comment?: string;
  correct_answer_id?: number;
  type?: string;
  is_invalid?: boolean;
  needs_review?: boolean;
  case_id?: number;
  answers?: Answer[];
  images?: QuestionImage[];
  case?: QuestionCase;
  add_to_deck_included_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Deck {
  id: number;
  name: string;
  description?: string;
  exam_at?: string;
  module_id?: number;
  user_id?: number;
  access?: 'private' | 'public-ro' | 'public-rw' | 'public-rw-listed';
  is_archived?: boolean;
  is_ephemeral?: boolean;
  parent_session_id?: number;
  module?: Module;
  questions?: Question[];
  cases?: QuestionCase[];
  sessions?: Session[];
  bookmarks?: Bookmark[];
  created_at?: string;
  updated_at?: string;
}

export interface Bookmark {
  id: number;
  user_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface AnswerChoice {
  id: number;
  session_id: number;
  question_id: number;
  answer_id: number;
  is_correct?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  id: number;
  name: string;
  deck_id: number;
  user_id?: number;
  current_question_id?: number;
  parent_session_id?: number;
  deck?: Deck;
  answerChoices?: AnswerChoice[];
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: number;
  name: string;
  public_name?: string;
  email: string;
  is_admin?: boolean;
  is_moderator?: boolean;
  is_enabled?: boolean;
  supabase_user_id?: string;
  email_verified_at?: string;
  last_login_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserSettings {
  id: number;
  user_id: number;
  session_show_sidebar?: boolean;
  session_exam_mode?: boolean;
  session_shuffle_answers?: boolean;
  session_multiple_attempts?: boolean;
  session_show_answer_stats?: boolean;
  session_show_progress_bar?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number;
  to?: number;
  path?: string;
  first_page_url?: string;
  last_page_url?: string;
  next_page_url?: string | null;
  prev_page_url?: string | null;
}

export interface SessionWithDeck {
  session: Session;
  deck: Deck;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}




