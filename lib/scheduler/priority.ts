// ============================================================
// Priority Scheduler
// Computes priority score and generates daily study plan
// ============================================================

import { Task, UserBehavior, PlanTask, StudyPlan, PriorityComponents } from '@/lib/types';

const WEIGHTS = {
  CRITICAL_PATH: 0.4,
  DEADLINE:      0.3,
  DIFFICULTY:    0.2,
  PROCRASTINATION: 0.1,
};

const MAX_PLAN_TASKS = 5;
const MAX_DAILY_MINUTES = 240; // 4 hours default
const MIN_REVISION_CHANCE = 1; // always include 1 revision

/**
 * Compute priority score for a task.
 *
 * priority = 0.4 * CPL_norm +
 *            0.3 * deadline_urgency +
 *            0.2 * difficulty +
 *            0.1 * procrastination_index
 */
export function computePriority(
  task: Task,
  behaviorMap: Map<string, UserBehavior>,
  maxCPL: number
): PriorityComponents {
  // 1. Critical path score (normalised 0-1)
  const critical_path_score = maxCPL > 0
    ? Math.min(1, task.critical_path_length / maxCPL)
    : 0;

  // 2. Deadline urgency (1 = due now/overdue, 0 = far future)
  let deadline_urgency = 0;
  if (task.deadline) {
    const hoursUntilDeadline = (new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilDeadline <= 0) {
      deadline_urgency = 1.0; // overdue
    } else if (hoursUntilDeadline < 24) {
      deadline_urgency = 0.9;
    } else if (hoursUntilDeadline < 48) {
      deadline_urgency = 0.7;
    } else if (hoursUntilDeadline < 72) {
      deadline_urgency = 0.5;
    } else if (hoursUntilDeadline < 168) {
      deadline_urgency = 0.3;
    } else {
      deadline_urgency = Math.max(0, 1 - hoursUntilDeadline / (24 * 30));
    }
  }

  // 3. Difficulty score (1 - success_rate = how hard this is for the user)
  const difficulty_score = 1 - task.success_rate;

  // 4. Procrastination index from user behavior
  const behavior = behaviorMap.get(task.topic);
  const procrastination_score = behavior?.procrastination_index ?? 0.5;

  const final_priority =
    WEIGHTS.CRITICAL_PATH * critical_path_score +
    WEIGHTS.DEADLINE * deadline_urgency +
    WEIGHTS.DIFFICULTY * difficulty_score +
    WEIGHTS.PROCRASTINATION * procrastination_score;

  return {
    critical_path_score,
    deadline_urgency,
    difficulty_score,
    procrastination_score,
    final_priority: Math.min(1, Math.max(0, final_priority)),
  };
}

/**
 * Reprioritize all tasks and return them sorted highest → lowest priority.
 */
export function reprioritizeTasks(
  tasks: Task[],
  behaviors: UserBehavior[]
): Task[] {
  const behaviorMap = new Map<string, UserBehavior>();
  for (const b of behaviors) behaviorMap.set(b.topic, b);

  const maxCPL = Math.max(...tasks.map(t => t.critical_path_length), 1);

  return tasks.map(task => {
    const { final_priority } = computePriority(task, behaviorMap, maxCPL);
    return { ...task, priority: final_priority };
  }).sort((a, b) => b.priority - a.priority);
}

/**
 * Generate a daily study plan.
 *
 * Rules:
 *  - Max 5 tasks
 *  - Total time ≤ availableMinutes (default 240)
 *  - Must include top-priority tasks
 *  - Must include at least 1 revision block
 *  - Avoid burnout (skip topics with high burnout_risk if alternatives exist)
 */
export function generateDailyPlan(
  readyTasks: Task[],
  allTasks: Task[],
  behaviors: UserBehavior[],
  availableMinutes: number = MAX_DAILY_MINUTES,
  targetDate: string = new Date().toISOString().split('T')[0]
): Omit<StudyPlan, 'id' | 'created_at'> {
  const behaviorMap = new Map<string, UserBehavior>();
  for (const b of behaviors) behaviorMap.set(b.topic, b);

  // Sort by priority desc
  const sorted = [...readyTasks].sort((a, b) => b.priority - a.priority);

  const planItems: PlanTask[] = [];
  let usedMinutes = 0;
  let hasRevision = false;
  let order = 1;

  // --- Pick top priority tasks (non-revision) ---
  for (const task of sorted) {
    if (planItems.length >= MAX_PLAN_TASKS - MIN_REVISION_CHANCE) break;
    if (usedMinutes + task.duration > availableMinutes) continue;
    if (task.task_type === 'review') continue; // handle separately

    const behavior = behaviorMap.get(task.topic);
    // Skip burnout topics if other options exist
    if ((behavior?.burnout_risk ?? 0) > 0.8 && sorted.length > MAX_PLAN_TASKS) continue;

    planItems.push({
      task_id: task.id,
      title: task.title,
      topic: task.topic,
      duration: task.duration,
      priority: task.priority,
      task_type: task.task_type,
      order: order++,
    });
    usedMinutes += task.duration;
  }

  // --- Add 1 revision block from done/practiced tasks ---
  if (!hasRevision && usedMinutes + 20 <= availableMinutes) {
    // Find best revision candidate: done task from weak topic
    const doneByTopic = new Map<string, Task[]>();
    for (const t of allTasks) {
      if (t.status === 'done') {
        if (!doneByTopic.has(t.topic)) doneByTopic.set(t.topic, []);
        doneByTopic.get(t.topic)!.push(t);
      }
    }

    let bestRevisionTopic = '';
    let lowestSuccessRate = 1;
    for (const [topic, _] of doneByTopic) {
      const sr = behaviorMap.get(topic)?.success_rate ?? 1;
      if (sr < lowestSuccessRate) {
        lowestSuccessRate = sr;
        bestRevisionTopic = topic;
      }
    }

    if (bestRevisionTopic) {
      const revisionTask = doneByTopic.get(bestRevisionTopic)?.[0];
      if (revisionTask) {
        planItems.push({
          task_id: revisionTask.id,
          title: `Revision: ${revisionTask.title}`,
          topic: revisionTask.topic,
          duration: Math.min(30, availableMinutes - usedMinutes),
          priority: 0.6,
          task_type: 'review',
          is_revision: true,
          order: order++,
        });
        usedMinutes += Math.min(30, availableMinutes - usedMinutes);
        hasRevision = true;
      }
    }
  }

  return {
    user_id: sorted[0]?.user_id ?? '',
    date: targetDate,
    tasks: planItems,
    total_time: usedMinutes,
  };
}
