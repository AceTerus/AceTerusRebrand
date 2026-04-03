-- Enable RLS on all omc_* tables (they are in public schema and exposed to PostgREST)
-- omc tables use their own omc_users.id (BIGINT), not Supabase auth UUIDs, so
-- policies grant access by authentication status rather than by row ownership.

-- ── Content / reference tables (authenticated read-only) ─────────────────────

ALTER TABLE omc_subjects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_modules             ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_cases               ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_questions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_answers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_images              ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_deck_question       ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_info                ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_magic_gifs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_deck_case           ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_decks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_users               ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read omc_subjects"
  ON omc_subjects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read omc_modules"
  ON omc_modules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read omc_cases"
  ON omc_cases FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read omc_questions"
  ON omc_questions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read omc_answers"
  ON omc_answers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read omc_images"
  ON omc_images FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read omc_deck_question"
  ON omc_deck_question FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read omc_info"
  ON omc_info FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read omc_magic_gifs"
  ON omc_magic_gifs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read omc_deck_case"
  ON omc_deck_case FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read omc_decks"
  ON omc_decks FOR SELECT TO authenticated USING (true);

-- omc_users: read-only (user lookup for display purposes, no auth mapping)
CREATE POLICY "Authenticated users can read omc_users"
  ON omc_users FOR SELECT TO authenticated USING (true);

-- ── User interaction tables (authenticated read/write) ────────────────────────

ALTER TABLE omc_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_answer_choices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_user_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_deck_submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_thumbs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_deck_bookmark       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage omc_sessions"
  ON omc_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage omc_answer_choices"
  ON omc_answer_choices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage omc_messages"
  ON omc_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage omc_user_settings"
  ON omc_user_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage omc_deck_submissions"
  ON omc_deck_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage omc_thumbs"
  ON omc_thumbs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage omc_deck_bookmark"
  ON omc_deck_bookmark FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Admin-sensitive tables (no PostgREST access) ─────────────────────────────
-- These contain signup settings and registration tokens — block all client access.

ALTER TABLE omc_admin_settings_signup   ENABLE ROW LEVEL SECURITY;
ALTER TABLE omc_registration_tokens     ENABLE ROW LEVEL SECURITY;

-- No policies created → all access denied by default (RLS with no matching policy = deny)
