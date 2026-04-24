// ============================================================
// Gemini Prompts — All structured prompts (strict JSON output)
// ============================================================

import { Task, TaskLog, UserBehavior, HealthReport, StudyPlan, ExperiencePattern } from '@/lib/types';

// ============================================================
// MASTER EXTRACTION ENGINE
// ============================================================
export function buildMasterExtractionPrompt(textChunk: string, weakTopics: string[] = []): string {
  const weakContext = weakTopics.length > 0
    ? `\nPRIORITIZE WEAK TOPICS: ${weakTopics.join(', ')}\n`
    : '';

  return `You are an advanced AI learning engine integrated into an adaptive study system.

Your goal is NOT just to explain content, but to convert academic material into structured knowledge, actionable study tasks, and learning assessments.

---

# 🧠 INPUT
${weakContext}
STUDY MATERIAL TO PROCESS:
${textChunk}

---

# ⚙️ OUTPUT FORMAT (STRICT)

Return ALL output in strictly formatted JSON mapping EXACTLY to this interface:

{
  "topics": [
    { "name": "Topic", "subtopics": ["sub1"], "difficulty": 0.5, "has_diagrams": false, "description": "Brief" }
  ],
  "subtopics": ["String list of all subtopics"],
  "notes": [
    {
      "topic": "Topic Name",
      "headings": ["Heading 1"],
      "bullet_points": ["Point 1", "Point 2"],
      "key_terms": ["Term 1"],
      "simple_explanation": "ELI5 explanation",
      "summary": "Short 2 sentence summary"
    }
  ],
  "tasks": [
    {
      "title": "Actionable title",
      "topic": "Topic Name",
      "subtopic": "Subtopic Name",
      "description": "What to do",
      "estimated_time": 30,
      "difficulty": "medium",
      "task_type": "learn",
      "dependencies_hint": ["Prerequisite topic"]
    }
  ],
  "quizzes": [
    {
      "topic": "Topic Name",
      "question": "The question string",
      "type": "mcq",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "Why A is correct",
      "difficulty": "medium"
    }
  ]
}

---

# 1. CONTENT EXTRACTION & STRUCTURE
* Extract topics, subtopics, key concepts, definitions, formulas, examples.
* Maintain hierarchy: Topic → Subtopic → Concept.

---

# 2. AUTO-GENERATED NOTES
For each topic, create notes.
* Notes must be concise, scannable, revision-focused.

---

# 3. TASK GENERATION (CRITICAL)
Convert content into actionable study tasks.
* Each task MUST be ≤ 45 minutes
* Validate task_type is in: 'learn', 'practice', 'review', 'quiz', 'project'

---

# 4. TASK DEPENDENCIES (IMPORTANT)
* Define logical order of learning via dependencies_hint.

---

# 5. SMART QUIZ GENERATION
Generate mcq, short_answer, and conceptual questions.

---

# 8. OUTPUT QUALITY RULES
* No long paragraphs
* Keep everything structured and clean
* Return pure JSON, no markdown block wrappers.`;
}

// ============================================================
// PLANNING PROMPT
// ============================================================
export function buildPlanningPrompt(
  tasks: Task[],
  behaviors: UserBehavior[],
  availableHours: number,
  date: string
): string {
  const weakTopics = behaviors
    .filter(b => b.success_rate < 0.5)
    .map(b => b.topic);

  return `You are an intelligent study coach. Create an optimized daily study plan.

DATE: ${date}
AVAILABLE HOURS: ${availableHours}

PENDING TASKS (sorted by priority):
${tasks.slice(0, 10).map(t =>
  `- [${t.priority.toFixed(2)}] ${t.title} | ${t.topic} | ${t.duration}min | deadline: ${t.deadline ?? 'none'}`
).join('\n')}

WEAK AREAS: ${weakTopics.join(', ') || 'None identified yet'}

Generate a realistic daily plan. Respond in JSON:
{
  "recommended_plan": [
    {
      "task_id": "uuid-here",
      "title": "task title",
      "topic": "topic name",
      "duration": 30,
      "order": 1,
      "reason": "Why this task is prioritized today"
    }
  ],
  "coaching_note": "1-2 sentence motivational and strategic note for the student"
}

Rules:
- Maximum 5 tasks
- Total time ≤ available hours × 60 minutes
- Include 1 revision task from past weak topics
- Do NOT overload — quality over quantity`;
}

// ============================================================
// REPLANNING PROMPT
// ============================================================
export function buildReplanningPrompt(
  failedTasks: Task[],
  health: HealthReport,
  currentPlan: StudyPlan | null
): string {
  return `You are an adaptive study assistant. The student is struggling and needs an immediate plan adjustment.

HEALTH SCORE: ${(health.health_score * 100).toFixed(0)}/100
FAILURE TREND: ${health.failure_trend > 0 ? 'WORSENING ↓' : 'IMPROVING ↑'}
RECOMMENDATION: ${health.recommendation}

FAILED/STRUGGLING TASKS:
${failedTasks.map(t => `- ${t.title} | ${t.topic} | attempts: ${t.attempt_count}`).join('\n')}

ORIGINAL PLAN TASKS:
${(currentPlan?.tasks ?? []).map(t => `- ${t.title} | ${t.duration}min`).join('\n') || 'No plan exists'}

Provide immediate replanning advice. Respond in JSON:
{
  "actions": [
    {
      "type": "reduce_duration|simplify|add_break|switch_topic|add_practice",
      "target_task_title": "task title",
      "reason": "specific reason",
      "new_duration": 25
    }
  ],
  "motivational_message": "Brief encouraging message",
  "root_cause": "time_management|difficulty|distraction|burnout|unclear_material",
  "suggested_focus": "What the student should focus on RIGHT NOW"
}`;
}

// ============================================================
// FAILURE ANALYSIS PROMPT
// ============================================================
export function buildFailureAnalysisPrompt(
  failedLogs: TaskLog[],
  tasks: Task[]
): string {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const failedDetails = failedLogs.map(log => {
    const task = taskMap.get(log.task_id);
    return `- Task: ${task?.title ?? 'Unknown'} | Topic: ${task?.topic ?? '?'} | Duration: ${task?.duration}min | Difficulty: ${task?.difficulty ?? '?'} | Notes: ${log.notes ?? 'none'}`;
  }).join('\n');

  return `You are an academic performance analyst. Analyze why a student is failing tasks.

FAILED TASKS (last 7 days):
${failedDetails}

Identify patterns and root causes. Respond in JSON:
{
  "root_causes": [
    {
      "cause": "time_management|difficulty|distraction|overload|unclear_concepts",
      "confidence": 0.8,
      "affected_topics": ["topic1"],
      "evidence": "Specific pattern you detected"
    }
  ],
  "recommended_interventions": [
    {
      "intervention": "What to change",
      "priority": "high|medium|low"
    }
  ],
  "estimated_recovery_days": 3
}`;
}

// ============================================================
// AI TUTOR PROMPT
// ============================================================
export function buildTutorSystemPrompt(context: {
  pendingTasks: Task[];
  behaviors: UserBehavior[];
  health: HealthReport | null;
  todayPlan: StudyPlan | null;
}): string {
  const urgentTasks = context.pendingTasks
    .filter(t => t.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 3);

  const weakTopics = context.behaviors
    .filter(b => b.success_rate < 0.5)
    .map(b => `${b.topic} (${(b.success_rate * 100).toFixed(0)}% success)`);

  const healthStatus = context.health
    ? `Health: ${(context.health.health_score * 100).toFixed(0)}/100 — ${context.health.recommendation}`
    : 'Health: Not computed yet';

  return `You are an expert AI study tutor with full context about this student's academic situation.

YOUR STUDENT'S CURRENT STATE:
${healthStatus}

URGENT TASKS (by deadline):
${urgentTasks.length > 0
  ? urgentTasks.map(t => `- ${t.title} | Due: ${t.deadline ?? 'N/A'} | Priority: ${(t.priority * 100).toFixed(0)}%`).join('\n')
  : '- No urgent deadlines'}

WEAK TOPICS NEEDING ATTENTION:
${weakTopics.length > 0 ? weakTopics.join('\n') : '- No major weak spots detected'}

TODAY'S PLAN:
${(context.todayPlan?.tasks ?? []).map(t => `- ${t.title} (${t.duration}min)`).join('\n') || '- No plan generated yet'}

INSTRUCTION:
- Be direct, specific, and action-oriented
- Prioritize urgency (deadlines > health > general advice)
- If the student is struggling, be empathetic but firm
- Suggest the next ONE best action they should take right now
- Keep responses concise (max 3-4 sentences unless they ask for detail)
- Never say "as an AI" — just be their study buddy`;
}
