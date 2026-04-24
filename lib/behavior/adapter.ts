// ============================================================
// Behavior Intelligence Adapter
// Adjusts tasks based on user performance vectors
// ============================================================

import { Task, UserBehavior, BehaviorAdaptation, TaskType } from '@/lib/types';

const STRUGGLE_THRESHOLD = 0.4;  // success_rate below this = struggling
const STRONG_THRESHOLD   = 0.8;  // success_rate above this = strong

/**
 * Generate adaptation recommendations for a task based on user behavior.
 */
export function adaptTask(
  task: Task,
  behavior: UserBehavior | undefined
): BehaviorAdaptation {
  if (!behavior) {
    return { task_id: task.id, recommendation: 'none', reason: 'No behavior data yet' };
  }

  const topicSuccessRate = behavior.success_rate;

  // --- Struggling ---
  if (topicSuccessRate < STRUGGLE_THRESHOLD || task.success_rate < STRUGGLE_THRESHOLD) {
    if (task.duration > 30) {
      return {
        task_id: task.id,
        recommendation: 'compress',
        new_duration: Math.max(20, Math.round(task.duration * 0.7)),
        reason: `Low success rate (${(task.success_rate * 100).toFixed(0)}%) — reducing session length`,
      };
    }

    if (task.difficulty > 0.6) {
      return {
        task_id: task.id,
        recommendation: 'simplify',
        new_difficulty: Math.max(0.1, task.difficulty - 0.2),
        reason: 'High difficulty with poor success — simplifying task',
      };
    }

    if (task.task_type === 'learn' || task.task_type === 'project') {
      return {
        task_id: task.id,
        recommendation: 'switch_type',
        new_type: 'practice',
        reason: 'Switching to practice-based learning to reinforce weak understanding',
      };
    }
  }

  // --- Strong performance ---
  if (topicSuccessRate > STRONG_THRESHOLD && task.success_rate > STRONG_THRESHOLD) {
    if (task.difficulty < 0.7) {
      return {
        task_id: task.id,
        recommendation: 'deepen',
        new_difficulty: Math.min(1.0, task.difficulty + 0.15),
        reason: `Strong performance (${(task.success_rate * 100).toFixed(0)}%) — increasing depth`,
      };
    }

    if (task.task_type === 'practice' && task.difficulty > 0.6) {
      return {
        task_id: task.id,
        recommendation: 'switch_type',
        new_type: 'project',
        reason: 'Ready for project-level application of strong concepts',
      };
    }
  }

  // --- Burnout risk ---
  if (behavior.burnout_risk > 0.7) {
    return {
      task_id: task.id,
      recommendation: 'compress',
      new_duration: Math.min(task.duration, 25),
      reason: 'High burnout risk — shortening session',
    };
  }

  return { task_id: task.id, recommendation: 'none', reason: 'Performance within normal range' };
}

/**
 * Apply adaptations to task list.
 * Returns updated tasks.
 */
export function applyAdaptations(
  tasks: Task[],
  behaviors: UserBehavior[]
): { tasks: Task[]; adaptations: BehaviorAdaptation[] } {
  const behaviorMap = new Map<string, UserBehavior>();
  for (const b of behaviors) behaviorMap.set(b.topic, b);

  const adaptations: BehaviorAdaptation[] = [];
  const updatedTasks = tasks.map(task => {
    const behavior = behaviorMap.get(task.topic);
    const adaptation = adaptTask(task, behavior);
    adaptations.push(adaptation);

    if (adaptation.recommendation === 'none') return task;

    const updated = { ...task };
    if (adaptation.new_duration !== undefined) updated.duration = adaptation.new_duration;
    if (adaptation.new_difficulty !== undefined) updated.difficulty = adaptation.new_difficulty;
    if (adaptation.new_type !== undefined) updated.task_type = adaptation.new_type;
    return updated;
  });

  return { tasks: updatedTasks, adaptations };
}
