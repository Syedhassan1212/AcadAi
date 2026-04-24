-- ============================================================
-- Migration: V2 Clean Architecture Hierarchy
-- Subject -> Topics -> Subtopics -> (Tasks/Quizzes/Notes)
-- ============================================================

-- 1. Create Base Hierarchy
CREATE TABLE IF NOT EXISTS subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id  UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subtopics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id    UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  difficulty  NUMERIC DEFAULT 0.5,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Explicit DAG Edges
CREATE TABLE IF NOT EXISTS subtopic_edges (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_subtopic_id UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  to_subtopic_id   UUID NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_subtopic_id, to_subtopic_id)
);

-- 3. Alter existing tables to map to Subtopics explicitly (Deprecating old string metadata)
-- We will add the columns as nullable first, to avoid breaking current schema completely during migration.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS subtopic_id UUID REFERENCES subtopics(id) ON DELETE CASCADE;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS subtopic_id UUID REFERENCES subtopics(id) ON DELETE CASCADE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS subtopic_id UUID REFERENCES subtopics(id) ON DELETE CASCADE;

-- 4. Apply RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopic_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects_own" ON subjects USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Explicitly allow topics/subtopics based on their parent subject ownership
CREATE POLICY "topics_own" ON topics 
  USING (EXISTS (SELECT 1 FROM subjects WHERE subjects.id = topics.subject_id AND subjects.user_id = auth.uid()));

CREATE POLICY "subtopics_own" ON subtopics 
  USING (EXISTS (
    SELECT 1 FROM topics 
    JOIN subjects ON subjects.id = topics.subject_id 
    WHERE topics.id = subtopics.topic_id AND subjects.user_id = auth.uid()
  ));

CREATE POLICY "edges_own" ON subtopic_edges 
  USING (EXISTS (
    SELECT 1 FROM subtopics
    JOIN topics ON topics.id = subtopics.topic_id
    JOIN subjects ON subjects.id = topics.subject_id
    WHERE subtopics.id = subtopic_edges.from_subtopic_id AND subjects.user_id = auth.uid()
  ));
