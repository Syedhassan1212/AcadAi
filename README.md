# Adaptive Study OS — Human AdaptOS v2

> A self-evolving, AI-powered academic intelligence system that converts uploaded study materials into a dependency-aware task execution graph, continuously adapts based on user behavior, and provides a context-aware AI tutor.

---

## 🚀 Quick Start

### 1. Fill in your environment variables

Edit `.env.local` with your real credentials:

```env
# Supabase — supabase.com → Your Project → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini — aistudio.google.com
GEMINI_API_KEY=your-gemini-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
WORKER_SECRET=any-long-random-string
SUPABASE_STORAGE_BUCKET=study-files
```

### 2. Run the database schema

In **Supabase → SQL Editor**, paste and run the entire contents of:

```txt
supabase/migrations/001_initial_schema.sql
```

### 3. Enable Google OAuth in Supabase

- Supabase Dashboard → Authentication → Providers → Google → Enable
- Add your Google OAuth Client ID + Secret

### 4. Create Storage Bucket

- Supabase Dashboard → Storage → New Bucket  
- Name: `study-files`  
- Public: `No`

### 5. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`

---

## 🧠 System Architecture

```txt
┌─────────────────────────────────────────────────────┐
│   Next.js 16 App Router (TypeScript + TailwindCSS) │
│   /dashboard  /upload  /tasks  /notes  /tutor      │
└──────────────────────┬─────────────────────────────┘
                       │ 13 API Routes
┌──────────────────────▼─────────────────────────────┐
│              Intelligence Modules                  │
│                                                     │
│  1. File Pipeline      lib/files/pipeline.ts        │
│  2. DAG Builder        lib/dag/builder.ts           │
│  3. Cycle Detector     lib/dag/builder.ts           │
│  4. Task Executor      lib/dag/executor.ts          │
│  5. Critical Path      lib/dag/critical-path.ts     │
│  6. Priority Scheduler lib/scheduler/priority.ts    │
│  7. Health Monitor     lib/health/monitor.ts        │
│  8. Replanning Engine  lib/replanning/engine.ts     │
│  9. Behavior Adapter   lib/behavior/adapter.ts      │
│ 10. Experience Replay  lib/behavior/experience-replay│
│ 11. Background Worker  lib/background/worker.ts     │
│ 12. Gemini Client      lib/gemini/client.ts         │
│ 13. All Prompts        lib/gemini/prompts.ts        │
└──────────────────────┬─────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────┐
│   Supabase PostgreSQL + Auth (Google OAuth)         │
│   Supabase Storage (PDF/DOCX files)                 │
│   Google Gemini API (gemini-1.5-flash)              │
└────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```txt
adaptive-study-os/
├── app/
│   ├── api/
│   │   ├── upload/
│   │   ├── tasks/
│   │   ├── tasks/[id]/
│   │   ├── tasks/ready/
│   │   ├── tasks/plan/
│   │   ├── tasks/replan/
│   │   ├── health/
│   │   ├── notes/
│   │   ├── tutor/
│   │   ├── behavior/
│   │   └── worker/
│   ├── dashboard/
│   ├── upload/
│   ├── tasks/
│   ├── notes/
│   ├── tutor/
│   └── login/
├── components/
├── lib/
└── supabase/
```

---

## ⚙️ Intelligence Modules

### DAG (Dependency-Aware Task Graph)

- Topics → Subtopics → Tasks converted into a directed acyclic graph
- **Cycle detection** via DFS color-marking (`WHITE/GRAY/BLACK`)
- **Kahn's algorithm** for topological sort
- `getReadyTasks()` only returns tasks with ALL dependencies marked `done`

### Critical Path Scheduler

```txt
critical_path_length(task)
= task.duration + max(child.critical_path_length)
```

Computed via bottom-up dynamic programming and stored per task.

### Priority Formula

```txt
priority =
  0.4 × critical_path_length_norm
+ 0.3 × deadline_urgency
+ 0.2 × difficulty × (1 - success_rate)
+ 0.1 × procrastination_index
```

### Health Monitor (CUSUM-like)

- Uses exponential recency weighting (`α = 0.85`)
- Detects downward productivity trends
- Triggers replanning when:
  - `health_score < 0.4`
  - `trend > 0.3`

### Replanning Engine

Triggered on failure, burnout risk, or deadline pressure:

1. Boost failed task priority (`+0.25`)
2. Compress easy task durations
3. Drop low-priority non-blocking tasks
4. Recalculate all priorities

### Experience Replay

Uses Exponential Moving Average (`α = 0.3`) to update:

- `success_rate`
- `avg_session_time`
- `procrastination_index`
- `consistency_score`
- `burnout_risk`
- `preferred_type`

### Background Worker (`/api/worker`)

```bash
curl -X POST https://your-app.vercel.app/api/worker \
  -H "Authorization: Bearer YOUR_WORKER_SECRET"
```

---

## 🤖 Gemini Integration

All AI uses **Google Gemini 1.5 Flash** (`gemini-1.5-flash`).

| Module | Purpose |
|---|---|
| Document parsing | Extract structured learning data |
| Task generation | Create ≤45 min dependency-aware tasks |
| Daily planning | Generate adaptive study plans |
| Replanning | Re-optimize schedules |
| Failure analysis | Detect root causes |
| AI Tutor | Context-aware tutoring |

---

## 🗄️ Database

7 tables with RLS enabled:

| Table | Purpose |
|---|---|
| `tasks` | DAG nodes + dependencies |
| `task_logs` | Execution history |
| `study_plans` | Daily plans |
| `notes` | Linked study notes |
| `user_behavior` | Performance vectors |
| `knowledge_nodes` | Topic graph |
| `uploaded_files` | File registry |

---

## 📅 Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/worker",
      "schedule": "0 */8 * * *"
    }
  ]
}
```

Add environment variables in Vercel:

- `WORKER_SECRET`
- All `.env.local` variables

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, TailwindCSS |
| Backend | Next.js API Routes |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| AI | Google Gemini 1.5 Flash |
| File Parsing | `pdf-parse`, `mammoth` |

---

## ⚠️ Requirements

- Node.js 18+
- Supabase project
- Google Gemini API key
- Google OAuth credentials