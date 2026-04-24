-- ============================================================
-- Migration: Quiz Performance Tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id       UUID REFERENCES subjects(id) ON DELETE CASCADE,
  score            INTEGER NOT NULL,
  total_questions  INTEGER NOT NULL,
  subtopic_ids     UUID[] DEFAULT '{}',
  difficulty       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_subject_id ON quiz_attempts(subject_id);

-- Apply RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_attempts_own" ON quiz_attempts
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Aggregation view for 7-day performance
CREATE OR REPLACE VIEW daily_study_stats AS
SELECT 
  user_id,
  DATE_TRUNC('day', started_at) as day,
  SUM(elapsed_seconds) / 60 as study_minutes
FROM study_sessions
WHERE status = 'completed' OR status = 'active'
GROUP BY user_id, day;
