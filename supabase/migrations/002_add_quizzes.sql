-- ============================================================
-- Migration: Add Quizzes Table
-- ============================================================

CREATE TABLE IF NOT EXISTS quizzes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic          TEXT NOT NULL,
  question       TEXT NOT NULL,
  question_type  TEXT NOT NULL CHECK (question_type IN ('mcq', 'short_answer', 'conceptual')),
  options        JSONB,
  correct_answer TEXT NOT NULL,
  explanation    TEXT,
  difficulty     TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_topic ON quizzes(topic);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quizzes_own" ON quizzes
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
