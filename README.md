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
```
supabase/migrations/001_initial_schema.sql
```

### 3. Enable Google OAuth in Supabase

- Supabase Dashboard → Authentication → Providers → Google → Enable
- Add your Google OAuth Client ID + Secret

### 4. Create Storage Bucket

- Supabase Dashboard → Storage → New Bucket → Name: `study-files` → Public: No

### 5. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🧠 System Architecture

```
┌─────────────────────────────────────────────────────┐
│   Next.js 16 App Router (TypeScript + TailwindCSS)  │
│   /dashboard  /upload  /tasks  /notes  /tutor       │
└──────────────────────┬──────────────────────────────┘
                       │ 13 API Routes
┌──────────────────────▼──────────────────────────────┐
│              10 Intelligence Modules                 │
│                                                      │
│  1. File Pipeline      lib/files/pipeline.ts         │
│  2. DAG Builder        lib/dag/builder.ts            │
│  3. Cycle Detector     lib/dag/builder.ts            │
│  4. Task Executor      lib/dag/executor.ts           │
│  5. Critical Path      lib/dag/critical-path.ts      │
│  6. Priority Scheduler lib/scheduler/priority.ts     │
│  7. Health Monitor     lib/health/monitor.ts         │
│  8. Replanning Engine  lib/replanning/engine.ts      │
│  9. Behavior Adapter   lib/behavior/adapter.ts       │
│ 10. Experience Replay  lib/behavior/experience-replay│
│ 11. Background Worker  lib/background/worker.ts      │
│ 12. Gemini Client      lib/gemini/client.ts          │
│ 13. All Prompts        lib/gemini/prompts.ts         │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│   Supabase PostgreSQL + Auth (Google OAuth)          │
│   Supabase Storage (PDF/DOCX files)                  │
│   Google Gemini API (gemini-1.5-flash)               │
└─────────────────────────────────────────────────────┘
```

---

## 📂 Project Structure

```
adaptive-study-os/
├── app/
│   ├── api/
│   │   ├── upload/          → File upload + pipeline trigger
│   │   ├── tasks/           → CRUD + ready tasks + daily plan
│   │   ├── tasks/[id]/      → Update task status (logs EMA)
│   │   ├── tasks/ready/     → getReadyTasks() — DAG enforced
│   │   ├── tasks/plan/      → Daily plan generator
│   │   ├── tasks/replan/    → Replanning engine
│   │   ├── health/          → Health monitor (CUSUM-like)
│   │   ├── notes/           → Notes CRUD
│   │   ├── tutor/           → AI Tutor (Gemini chat)
│   │   ├── behavior/        → User behavior vectors
│   │   └── worker/          → Background adaptation loop
│   ├── dashboard/           → Today's plan + health + stats
│   ├── upload/              → File upload + pipeline viz
│   ├── tasks/               → DAG graph + task list
│   ├── notes/               → Notes system
│   ├── tutor/               → AI chat interface
│   └── login/               → Google OAuth
├── components/
│   ├── Sidebar.tsx          → Navigation
│   ├── TaskCard.tsx         → Task display + actions
│   ├── DAGGraph.tsx         → Canvas-rendered DAG
│   ├── HealthRing.tsx       → SVG health gauge
│   └── UploadZone.tsx       → Drag-drop upload
├── lib/
│   ├── dag/                 → DAG builder, executor, critical path
│   ├── scheduler/           → Priority formula + daily planner
│   ├── health/              → CUSUM health monitor
│   ├── replanning/          → Replanning engine
│   ├── behavior/            → Adapter + experience replay
│   ├── background/          → Adaptation worker
│   ├── gemini/              → Client + all prompts
│   ├── files/               → Full processing pipeline
│   ├── supabase/            → Client + server factories
│   └── types/               → All TypeScript interfaces
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql
```

---

## ⚙️ Intelligence Modules

### DAG (Dependency-Aware Task Graph)
- Topics → Subtopics → Tasks converted into a directed acyclic graph
- **Cycle detection** via DFS color-marking (WHITE/GRAY/BLACK)
- **Kahn's algorithm** for topological sort
- `getReadyTasks()` only returns tasks with ALL dependencies `done`

### Critical Path Scheduler
```
critical_path_length(task) = task.duration + max(child.critical_path_length)
```
Computed via bottom-up dynamic programming. Stored in DB per task.

### Priority Formula
```
priority = 0.4 × critical_path_length_norm
         + 0.3 × deadline_urgency
         + 0.2 × difficulty (1 - success_rate)
         + 0.1 × procrastination_index
```

### Health Monitor (CUSUM-like)
- Analyzes last 10–20 task logs with **exponential recency weighting** (α=0.85)
- Compares first-half vs second-half of window for **trend detection** (not spike detection)
- Returns `health_score ∈ [0,1]`. Triggers replan if `score < 0.4` or `trend > 0.3`

### Replanning Engine
Triggered automatically on failure / health decline / deadline pressure:
1. Boost failed task priority (+0.25)
2. Compress easy task durations (→ 70%, min 20 min)
3. Drop lowest-priority non-blocking tasks if overloaded
4. Recalculate all priorities

### Experience Replay
Uses Exponential Moving Average (α=0.3) to update:
- `success_rate`, `avg_session_time`, `procrastination_index`
- `consistency_score`, `burnout_risk`, `preferred_type`

### Background Worker (`/api/worker`)
Runs every 6-12h (trigger via Vercel Cron or manual call):
```bash
curl -X POST https://your-app.vercel.app/api/worker \
  -H "Authorization: Bearer YOUR_WORKER_SECRET"
```

---

## 🤖 Gemini Integration

All AI uses **Google Gemini 1.5 Flash** (`gemini-1.5-flash`):

| Module | Prompt |
|--------|--------|
| Document parsing | Extract topics/subtopics/difficulty as JSON |
| Task generation | Break into ≤45min tasks with dependencies |
| Daily planning | Generate realistic plan for weak areas |
| Replanning | Reduce overload, prioritize urgent tasks |
| Failure analysis | Root cause: time, difficulty, distraction |
| AI Tutor | Full-context chat with urgency awareness |

---

## 🗄️ Database

7 tables with RLS enabled:

| Table | Purpose |
|-------|---------|
| `tasks` | DAG nodes with dependencies, priority, critical path |
| `task_logs` | Execution records for trend analysis |
| `study_plans` | Daily generated plans (JSONB) |
| `notes` | User notes linked to tasks |
| `user_behavior` | Per-topic performance vectors |
| `knowledge_nodes` | Topics/subtopics/concepts from files |
| `uploaded_files` | File registry with processing status |

---

## 📅 Vercel Cron (Background Worker)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/worker",
    "schedule": "0 */8 * * *"
  }]
}
```

Add to Vercel environment variables:
- `WORKER_SECRET` = same value as in `.env.local`
- All other env vars from `.env.local`

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TypeScript, TailwindCSS |
| Backend | Next.js API Routes, Server Components |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (Google OAuth) |
| Storage | Supabase Storage |
| AI | Google Gemini 1.5 Flash (text + vision) |
| File Parsing | pdf-parse, mammoth |

---

## ⚠️ Requirements

- Node.js 18+
- Supabase project (free tier works)
- Google Gemini API key (free tier: 15 req/min)
- Google OAuth credentials (for login)
#   A c a d A i 
 
 "# aaaa" 
"# aaaa" 
"# aaaa" 
#   A c a d A i  
 