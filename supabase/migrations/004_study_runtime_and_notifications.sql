-- ============================================================
-- Migration: Study Runtime + Notifications + DAG Progress
-- ============================================================

CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  session_title TEXT NOT NULL,
  planned_minutes INTEGER NOT NULL CHECK (planned_minutes > 0 AND planned_minutes <= 120),
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_status ON study_sessions(status);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_reminder', 'streak_alert', 'deadline_warning', 'nudge', 'session_complete')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  deliver_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_deliver_at ON notifications(deliver_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

CREATE TABLE IF NOT EXISTS subtopic_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  studied_minutes INTEGER NOT NULL DEFAULT 0,
  completion_percent NUMERIC NOT NULL DEFAULT 0 CHECK (completion_percent >= 0 AND completion_percent <= 100),
  mastery_level NUMERIC NOT NULL DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 1),
  weak_area_score NUMERIC NOT NULL DEFAULT 0 CHECK (weak_area_score >= 0 AND weak_area_score <= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, subtopic_id)
);

CREATE INDEX IF NOT EXISTS idx_subtopic_progress_user_id ON subtopic_progress(user_id);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopic_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "study_sessions_own" ON study_sessions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_own" ON notifications
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subtopic_progress_own" ON subtopic_progress
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
