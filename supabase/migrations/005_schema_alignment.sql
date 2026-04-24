-- ============================================================
-- Migration: Canonical Schema Alignment (safe ALTER + backfill)
-- Goal: align existing DB with Adaptive Study OS production contract
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1) Knowledge graph alignment
-- ------------------------------------------------------------

-- subjects(name) alias to existing title
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS name TEXT;
UPDATE subjects SET name = title WHERE name IS NULL;

-- subtopics estimated_time required by canonical model
ALTER TABLE subtopics ADD COLUMN IF NOT EXISTS estimated_time INTEGER;
UPDATE subtopics SET estimated_time = 30 WHERE estimated_time IS NULL;
ALTER TABLE subtopics ALTER COLUMN estimated_time SET DEFAULT 30;

-- uploaded_files topic relation and metadata payload
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES topics(id) ON DELETE SET NULL;
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

UPDATE uploaded_files
SET file_url = storage_path
WHERE file_url IS NULL;

-- ------------------------------------------------------------
-- 2) Notes: keep AI + user-modified content separately
-- ------------------------------------------------------------
ALTER TABLE notes ADD COLUMN IF NOT EXISTS ai_content TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_content TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS merged_content TEXT;

UPDATE notes
SET merged_content = content
WHERE merged_content IS NULL;

-- Keep legacy content path in sync for old codepaths.
UPDATE notes
SET ai_content = COALESCE(ai_content, content)
WHERE ai_content IS NULL;

-- ------------------------------------------------------------
-- 3) Tasks alignment (aliases for canonical naming)
-- ------------------------------------------------------------
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS type TEXT;
UPDATE tasks SET type = task_type WHERE type IS NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_time INTEGER;
UPDATE tasks SET estimated_time = duration WHERE estimated_time IS NULL;
ALTER TABLE tasks ALTER COLUMN estimated_time SET DEFAULT 30;

-- Enforce <= 45m on canonical column too
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_estimated_time_check'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_estimated_time_check
      CHECK (estimated_time >= 5 AND estimated_time <= 45);
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4) Quizzes alignment (store generated quiz payload)
-- ------------------------------------------------------------
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS questions_json JSONB;

-- Existing row-per-question records can be represented as a single-question payload.
UPDATE quizzes
SET questions_json = jsonb_build_array(
  jsonb_build_object(
    'question', question,
    'question_type', question_type,
    'options', options,
    'correct_answer', correct_answer,
    'explanation', explanation,
    'difficulty', difficulty
  )
)
WHERE questions_json IS NULL;

-- ------------------------------------------------------------
-- 5) Runtime + behavior normalization
-- ------------------------------------------------------------

-- study_sessions naming aliases
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS duration INTEGER;
UPDATE study_sessions
SET start_time = started_at
WHERE start_time IS NULL;
UPDATE study_sessions
SET duration = planned_minutes
WHERE duration IS NULL;

-- task_logs canonical columns
ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE task_logs ADD COLUMN IF NOT EXISTS time_spent INTEGER;

UPDATE task_logs
SET result = CASE WHEN completed THEN 'success' ELSE 'failed' END
WHERE result IS NULL;

UPDATE task_logs
SET time_spent = actual_time
WHERE time_spent IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'task_logs_result_check'
  ) THEN
    ALTER TABLE task_logs
      ADD CONSTRAINT task_logs_result_check
      CHECK (result IN ('success', 'failed', 'skipped', 'partial'));
  END IF;
END $$;

-- user_behavior aggregated fields expected by canonical contract
ALTER TABLE user_behavior ADD COLUMN IF NOT EXISTS global_success_rate NUMERIC;
ALTER TABLE user_behavior ADD COLUMN IF NOT EXISTS global_consistency_score NUMERIC;

UPDATE user_behavior
SET global_success_rate = success_rate
WHERE global_success_rate IS NULL;

UPDATE user_behavior
SET global_consistency_score = consistency_score
WHERE global_consistency_score IS NULL;

-- subtopic_progress aliases
ALTER TABLE subtopic_progress ADD COLUMN IF NOT EXISTS completion NUMERIC;
ALTER TABLE subtopic_progress ADD COLUMN IF NOT EXISTS mastery_score NUMERIC;

UPDATE subtopic_progress
SET completion = completion_percent
WHERE completion IS NULL;

UPDATE subtopic_progress
SET mastery_score = mastery_level
WHERE mastery_score IS NULL;

-- ------------------------------------------------------------
-- 6) Performance indexes for core requests
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_uploaded_files_topic_id ON uploaded_files(topic_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_topic_id ON subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_tasks_subtopic_id ON tasks(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_notes_subtopic_id ON notes(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_subtopic_id ON quizzes(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_result ON task_logs(result);
CREATE INDEX IF NOT EXISTS idx_subtopic_progress_subtopic_id ON subtopic_progress(subtopic_id);

-- ------------------------------------------------------------
-- 7) Trigger to keep note columns synchronized
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_notes_content_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- If merged content not supplied, derive it from user_content, else AI.
  IF NEW.merged_content IS NULL THEN
    NEW.merged_content := COALESCE(NEW.user_content, NEW.ai_content, NEW.content);
  END IF;

  -- Keep legacy column for backwards compatibility.
  IF NEW.content IS NULL THEN
    NEW.content := NEW.merged_content;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notes_sync_content_columns ON notes;
CREATE TRIGGER notes_sync_content_columns
  BEFORE INSERT OR UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION sync_notes_content_columns();

