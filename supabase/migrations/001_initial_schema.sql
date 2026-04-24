-- ============================================================
-- Adaptive Study OS — Initial Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TASKS (DAG nodes)
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  topic               TEXT NOT NULL,
  subtopic            TEXT,
  description         TEXT,
  duration            INTEGER NOT NULL DEFAULT 30 CHECK (duration <= 45 AND duration >= 5),
  priority            FLOAT NOT NULL DEFAULT 0.5,
  deadline            TIMESTAMPTZ,
  dependencies        UUID[] DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','ready','in_progress','done','failed','skipped')),
  task_type           TEXT DEFAULT 'learn'
                        CHECK (task_type IN ('learn','practice','review','quiz','project')),
  difficulty          FLOAT DEFAULT 0.5 CHECK (difficulty >= 0 AND difficulty <= 1),
  success_rate        FLOAT DEFAULT 1.0 CHECK (success_rate >= 0 AND success_rate <= 1),
  avg_time            FLOAT,
  critical_path_length FLOAT DEFAULT 0,
  source_file_id      UUID,
  attempt_count       INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_id     ON tasks(user_id);
CREATE INDEX idx_tasks_status      ON tasks(status);
CREATE INDEX idx_tasks_deadline    ON tasks(deadline);
CREATE INDEX idx_tasks_priority    ON tasks(priority DESC);
CREATE INDEX idx_tasks_topic       ON tasks(topic);

-- ============================================================
-- TASK LOGS (execution records for trend analysis)
-- ============================================================
CREATE TABLE IF NOT EXISTS task_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed     BOOLEAN NOT NULL DEFAULT FALSE,
  actual_time   INTEGER,   -- minutes taken
  difficulty_felt FLOAT,   -- user-reported 0-1
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_logs_task_id    ON task_logs(task_id);
CREATE INDEX idx_task_logs_user_id    ON task_logs(user_id);
CREATE INDEX idx_task_logs_created_at ON task_logs(created_at);

-- ============================================================
-- STUDY PLANS (daily generated plans)
-- ============================================================
CREATE TABLE IF NOT EXISTS study_plans (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  tasks      JSONB NOT NULL DEFAULT '[]',
  total_time INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_study_plans_user_date ON study_plans(user_id, date);

-- ============================================================
-- NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT,
  content      TEXT NOT NULL,
  linked_tasks UUID[] DEFAULT '{}',
  tags         TEXT[] DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_user_id    ON notes(user_id);
CREATE INDEX idx_notes_created_at ON notes(created_at);

-- ============================================================
-- USER BEHAVIOR (intelligence/adaptation vectors)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_behavior (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic                TEXT NOT NULL,
  success_rate         FLOAT DEFAULT 0.5,
  preferred_type       TEXT DEFAULT 'learn',
  procrastination_index FLOAT DEFAULT 0.5,
  consistency_score    FLOAT DEFAULT 0.5,
  burnout_risk         FLOAT DEFAULT 0.0,
  avg_session_time     FLOAT DEFAULT 30,
  total_sessions       INTEGER DEFAULT 0,
  last_session_at      TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

CREATE INDEX idx_user_behavior_user_id ON user_behavior(user_id);
CREATE INDEX idx_user_behavior_topic   ON user_behavior(topic);

-- ============================================================
-- KNOWLEDGE NODES (DAG topic/subtopic metadata)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id      UUID,
  label        TEXT NOT NULL,
  node_type    TEXT NOT NULL CHECK (node_type IN ('topic','subtopic','concept')),
  parent_id    UUID REFERENCES knowledge_nodes(id),
  difficulty   FLOAT DEFAULT 0.5,
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_nodes_user_id   ON knowledge_nodes(user_id);
CREATE INDEX idx_knowledge_nodes_file_id   ON knowledge_nodes(file_id);
CREATE INDEX idx_knowledge_nodes_parent_id ON knowledge_nodes(parent_id);

-- ============================================================
-- UPLOADED FILES (registry)
-- ============================================================
CREATE TABLE IF NOT EXISTS uploaded_files (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  processing_status TEXT DEFAULT 'pending'
                    CHECK (processing_status IN ('pending','processing','done','failed')),
  extracted_topics JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_uploaded_files_user_id ON uploaded_files(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior   ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files  ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data
CREATE POLICY "tasks_own" ON tasks
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "task_logs_own" ON task_logs
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "study_plans_own" ON study_plans
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_own" ON notes
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_behavior_own" ON user_behavior
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "knowledge_nodes_own" ON knowledge_nodes
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "uploaded_files_own" ON uploaded_files
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER user_behavior_updated_at
  BEFORE UPDATE ON user_behavior
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
