# Adaptive Study OS v3 Architecture

## 1) Knowledge hierarchy

`Subject -> Topic -> Lecture Docs -> Subtopic -> Tasks -> Quizzes -> Notes`

- `subjects`: user learning domains
- `topics`: chapters or learning tracks within a subject
- `uploaded_files`: lecture material (PDF/DOCX/PPT/TXT)
- `subtopics`: atomic learning nodes
- `tasks`: executable work units (max 45 min)
- `quizzes`: AI-generated checks (mcq/short/conceptual with difficulty)
- `notes`: AI + user notes tied to study nodes

## 2) DAG progress model

- `subtopic_edges` stores prerequisite edges
- `subtopic_progress` stores per-node progress:
  - `completion_percent`
  - `mastery_level`
  - `weak_area_score`
  - `studied_minutes`

This enables topological readiness checks and weak-area targeting.

## 3) Runtime systems

- `study_sessions`: active/paused/completed focus sessions
- `notifications`: reminders, streak alerts, deadline warnings, AI nudges
- UI runtime:
  - session timer with pause/resume/stop
  - focus mode takeover
  - settings persistence
  - notifications drawer

## 4) API structure

- `POST /api/upload`: process lecture resources via file pipeline
- `GET/POST /api/tasks`: list + create actionable tasks
- `PATCH /api/tasks/:id`: task status actions from UI
- `POST /api/quiz/generate`: dynamic quiz generation
- `POST /api/notes/generate`: AI notes generation
- `POST /api/tutor`: context-aware AI tutor

## 5) Component breakdown

- `components/tasks/SubjectList`: subject/topic creation + lecture navigation
- `components/tasks/LectureView`: highlight-to-note + lecture AI actions
- `components/dashboard/DailyPlanList`: task actions (start/complete)
- `components/UIProvider`: global runtime state + persistence
- `components/UIOverlays`: focus, timer, settings, session modal, notifications

## 6) Event flow

1. User uploads lecture file
2. System stores file, parses content, extracts topics/subtopics
3. AI generates tasks/quizzes/notes candidates
4. DAG dependencies are created/updated
5. UI shows ready tasks and weak nodes
6. User starts focus session
7. Timer and progress update session + notifications
8. Completion updates task logs, behavior vectors, and mastery

## 7) Stability and fallback strategy

- UI state persisted in local storage with guarded parsing
- Signed URL generation for uploaded resources with user-facing fallback errors
- API interactions use explicit `try/catch` and structured response checks
- Session completion emits notification when enabled
