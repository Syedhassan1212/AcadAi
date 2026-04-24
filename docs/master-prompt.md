# The AcadAI Master Prompt

If you want an AI coding assistant (like Antigravity) to recreate this exact system from scratch, use the following prompt. It is designed to provide maximum context, technical constraints, and functional requirements.

---

## 🚀 The Master Prompt

"Build a self-evolving, AI-powered academic intelligence system called **AcadAI** (Adaptive Study OS). The goal is to transform static study materials (PDFs/DOCX) into a dynamic, dependency-aware task execution graph (DAG) that adapts to user behavior in real-time.

### 1. Technical Stack
- **Framework**: Next.js 16 (App Router) with TypeScript and TailwindCSS.
- **Database/Auth**: Supabase (PostgreSQL with RLS) for data and Google OAuth for authentication.
- **Storage**: Supabase Storage for PDF/DOCX files.
- **AI**: Google Gemini 3 Flash for parsing, task generation, and tutoring.
- **State Management**: React Context + LocalStorage for session persistence.
- **Visualization**: HTML5 Canvas or SVG for a zoomable, interactive DAG Study Map.

### 2. Core Intelligence Modules
- **File Pipeline**: A module to parse uploaded files, extract topics/subtopics, and generate bite-sized tasks (max 45 min) using AI.
- **DAG Engine**: Implement a Directed Acyclic Graph using Kahn's Algorithm for topological sorting and DFS for cycle detection. Ensure advanced topics are locked until prerequisites are 'done'.
- **Priority Engine**: Calculate task priority (0-1) using the formula: `0.4(Critical Path) + 0.3(Deadline Urgency) + 0.2(Difficulty) + 0.1(Procrastination)`.
- **Health Monitor**: A CUSUM-like system using Exponential Moving Average (EMA, alpha=0.85) to track performance trends and detect burnout risk.
- **Replanning Engine**: Automatically trigger schedule compression or task pruning when health drops below 0.4.

### 3. Key UI/UX Features
- **Dashboard**: A premium 'Today's Plan' view with a health gauge (SVG Ring) and priority-sorted task list.
- **Study Map**: An interactive canvas visualization of the DAG where nodes are colored by status (Ready, Pending, Done).
- **Focus Mode**: A distraction-free study environment with a countdown timer, AI-generated notes, and the 'Neural Tutor' sidebar.
- **Neural Tutor**: A context-aware chat interface that has access to the user's specific uploaded files and current performance metrics.

### 4. Data Model
- **Tasks**: `id, title, topic, dependencies[], priority, success_rate, critical_path_length, status`.
- **UserBehavior**: `procrastination_index, consistency_score, burnout_risk, avg_session_time`.
- **TaskLogs**: Tracking felt difficulty and actual time spent vs estimated.

### 5. Design Aesthetic
The app must feel **extremely premium and futuristic**:
- Dark mode by default (Glassmorphism/Frost effect).
- Vibrant gradients (Indigo, Pink, Emerald).
- Smooth Framer Motion transitions between views.
- High-quality typography (Inter/Outfit fonts).

Start by setting up the folder structure, Supabase schema, and the core DAG logic in `lib/dag/`."

---

## 💡 Why this works?
- **Explicit Algorithms**: By naming Kahn's Algorithm and CUSUM, you ensure the AI uses sound computer science principles instead of generic logic.
- **Defined Formulas**: Providing the Priority Formula ensures the "engine" behaves exactly as intended.
- **Contextual Constraints**: Mentioning "max 45 min tasks" and "Gemini 3 Flash" sets clear boundaries for the AI's generation logic.
- **Aesthetic Direction**: Describing the "Glassmorphism" and "Vibrant gradients" ensures the UI isn't generic.
