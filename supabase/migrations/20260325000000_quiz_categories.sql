-- Quiz categories table
CREATE TABLE IF NOT EXISTS quiz_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  description text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE quiz_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read categories
CREATE POLICY "quiz_categories_select"
  ON quiz_categories FOR SELECT USING (true);

-- Authenticated users can insert (admin guard enforced in the app layer)
CREATE POLICY "quiz_categories_insert"
  ON quiz_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "quiz_categories_update"
  ON quiz_categories FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "quiz_categories_delete"
  ON quiz_categories FOR DELETE USING (auth.role() = 'authenticated');
