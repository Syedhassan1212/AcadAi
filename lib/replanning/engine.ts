// ============================================================
// Replanning Engine
// Triggered by: task failure, health decline, deadline pressure
// ============================================================

import { Task, HealthReport, ReplanAction, ReplanResult, UserBehavior } from '@/lib/types';
import { computePriority } from '@/lib/scheduler/priority';

const MIN_DURATION = 20;   // Never compress below 20 min
const MAX_PLAN_TASKS = 5;

interface ReplanContext {
  tasks: Task[];
  behaviors: UserBehavior[];
  health: HealthReport;
  availableMinutes: number;
  failedTaskIds?: string[];
}

/**
 * Main replanning function.
 * Returns a set of actions to apply to the DB.
 */
export function replan(ctx: ReplanContext): ReplanResult {
  const actions: ReplanAction[] = [];
  const updatedTaskIds: string[] = [];
  const droppedTaskIds: string[] = [];

  const behaviorMap = new Map<string, UserBehavior>();
  for (const b of ctx.behaviors) behaviorMap.set(b.topic, b);

  const maxCPL = Math.max(...ctx.tasks.map(t => t.critical_path_length), 1);

  let workingTasks = ctx.tasks.map(t => ({ ...t }));

  // -------- 1. Boost priority of recently failed tasks --------
  const failedIds = new Set(ctx.failedTaskIds ?? []);
  for (const task of workingTasks) {
    if (failedIds.has(task.id) || task.status === 'failed') {
      const oldPriority = task.priority;
      task.priority = Math.min(1.0, task.priority + 0.25);
      actions.push({
        type: 'boost_priority',
        task_id: task.id,
        reason: 'Task previously failed — escalating urgency',
        old_value: oldPriority,
        new_value: task.priority,
      });
      updatedTaskIds.push(task.id);
    }
  }

  // -------- 2. Compress durations if overloaded --------
  const pendingTasks = workingTasks.filter(
    t => t.status === 'pending' || t.status === 'ready'
  );
  const totalPendingTime = pendingTasks.reduce((s, t) => s + t.duration, 0);

  if (totalPendingTime > ctx.availableMinutes * 1.5) {
    // Compress tasks with high success_rate (easier) first
    const compressable = pendingTasks
      .filter(t => t.success_rate > 0.7 && t.duration > MIN_DURATION)
      .sort((a, b) => b.success_rate - a.success_rate);

    for (const task of compressable) {
      if (totalPendingTime <= ctx.availableMinutes * 1.2) break;
      const task_ref = workingTasks.find(t => t.id === task.id)!;
      const oldDuration = task_ref.duration;
      task_ref.duration = Math.max(MIN_DURATION, Math.round(task_ref.duration * 0.7));
      actions.push({
        type: 'compress_duration',
        task_id: task.id,
        reason: 'Overloaded schedule — compressing lower-difficulty tasks',
        old_value: oldDuration,
        new_value: task_ref.duration,
      });
      updatedTaskIds.push(task.id);
    }
  }

  // -------- 3. Drop low-priority tasks if still overloaded --------
  const pendingAfterCompress = workingTasks.filter(
    t => t.status === 'pending' || t.status === 'ready'
  );
  const totalAfterCompress = pendingAfterCompress.reduce((s, t) => s + t.duration, 0);

  if (totalAfterCompress > ctx.availableMinutes * 2) {
    // Sort by priority asc — drop lowest priority tasks
    const sortedByPriority = [...pendingAfterCompress].sort((a, b) => a.priority - b.priority);
    let timeToFree = totalAfterCompress - ctx.availableMinutes * 1.5;

    for (const task of sortedByPriority) {
      if (timeToFree <= 0) break;
      if (task.dependencies.length > 0) continue; // Don't skip if others depend on it

      // Check if other tasks depend on this
      const isBlocker = workingTasks.some(
        t => t.dependencies.includes(task.id) &&
             (t.status === 'pending' || t.status === 'ready')
      );
      if (isBlocker) continue;

      const task_ref = workingTasks.find(t => t.id === task.id)!;
      task_ref.status = 'skipped';
      actions.push({
        type: 'drop_task',
        task_id: task.id,
        reason: 'Schedule overloaded — dropping lowest priority non-blocking task',
        old_value: 'pending',
        new_value: 'skipped',
      });
      droppedTaskIds.push(task.id);
      timeToFree -= task.duration;
    }
  }

  // -------- 4. Recalculate priorities for all remaining tasks --------
  for (const task of workingTasks) {
    if (task.status === 'pending' || task.status === 'ready') {
      const { final_priority } = computePriority(task, behaviorMap, maxCPL);
      task.priority = final_priority;
    }
  }

  actions.push({
    type: 'recalculate_dag',
    reason: 'Post-replan priority recalculation',
  });

  return {
    actions,
    updated_tasks: [...new Set(updatedTaskIds)],
    dropped_tasks: droppedTaskIds,
  };
}

/**
 * Apply replan result to DB via Supabase client.
 * Returns count of updated records.
 */
export async function applyReplanToDb(
  result: ReplanResult,
  tasks: Task[],
  supabase: any
): Promise<number> {
  let count = 0;
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  for (const action of result.actions) {
    if (!action.task_id) continue;
    const task = taskMap.get(action.task_id);
    if (!task) continue;

    const updates: Partial<Task> = {};

    if (action.type === 'boost_priority') updates.priority = action.new_value as number;
    if (action.type === 'compress_duration') updates.duration = action.new_value as number;
    if (action.type === 'drop_task') updates.status = 'skipped';

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', action.task_id);
      if (!error) count++;
    }
  }

  return count;
}
