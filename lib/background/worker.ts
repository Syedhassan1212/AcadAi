// ============================================================
// Background Adaptation Worker
// Runs every 6-12 hours to recompute behavior, priorities, and replan
// ============================================================

import { createAdminClient } from '@/lib/supabase/server';
import { Task, TaskLog, UserBehavior, WorkerResult } from '@/lib/types';
import { buildDAG } from '@/lib/dag/builder';
import { computeCriticalPaths } from '@/lib/dag/critical-path';
import { reprioritizeTasks } from '@/lib/scheduler/priority';
import { computeHealthScore, detectBurnoutRisk } from '@/lib/health/monitor';
import { replan } from '@/lib/replanning/engine';
import { replayAndUpdateBehavior } from '@/lib/behavior/experience-replay';

/**
 * Main background worker function.
 * Called via /api/worker/run — protected by WORKER_SECRET.
 */
export async function runAdaptationWorker(): Promise<WorkerResult> {
  const result: WorkerResult = {
    ran_at: new Date().toISOString(),
    behavior_updated: 0,
    priorities_updated: 0,
    replan_triggered: false,
    errors: [],
  };

  const supabase = createAdminClient();

  try {
    // Fetch all users with activity in last 24h
    const { data: recentUsers, error: userErr } = await supabase
      .from('task_logs')
      .select('user_id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (userErr) {
      result.errors.push(`Failed to fetch users: ${userErr.message}`);
      return result;
    }

    const rawIds: string[] = (recentUsers ?? []).map((r: any) => String(r.user_id));
    const userIds = Array.from(new Set(rawIds));

    for (const userId of userIds) {
      try {
        await processUser(userId, supabase, result);
      } catch (err: any) {
        result.errors.push(`User ${userId} error: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.errors.push(`Worker fatal error: ${err.message}`);
  }

  return result;
}

async function processUser(userId: string, supabase: any, result: WorkerResult) {
  // ---- 1. Fetch user data ----
  const [tasksRes, logsRes, behaviorsRes] = await Promise.all([
    supabase.from('tasks').select('*').eq('user_id', userId),
    supabase.from('task_logs').select('*').eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false }),
    supabase.from('user_behavior').select('*').eq('user_id', userId),
  ]);

  const tasks: Task[] = tasksRes.data ?? [];
  const logs: TaskLog[] = logsRes.data ?? [];
  const behaviors: UserBehavior[] = behaviorsRes.data ?? [];

  if (tasks.length === 0) return;

  // ---- 2. Update user_behavior via Experience Replay ----
  const tasksMap = new Map(tasks.map((t: Task) => [t.id, t]));

  for (const behavior of behaviors) {
    const updates = replayAndUpdateBehavior(behavior, logs, tasksMap);
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('user_behavior')
        .update(updates)
        .eq('id', behavior.id);
      result.behavior_updated++;
    }
  }

  // ---- 3. Recompute Critical Paths ----
  const dag = buildDAG(tasks);
  const cpMap = computeCriticalPaths(dag);

  for (const [taskId, cpLength] of cpMap) {
    const task = tasks.find((t: Task) => t.id === taskId);
    if (task && task.critical_path_length !== cpLength) {
      await supabase
        .from('tasks')
        .update({ critical_path_length: cpLength })
        .eq('id', taskId);
    }
  }

  // ---- 4. Re-prioritize all tasks ----
  const updatedBehaviors: UserBehavior[] = behaviorsRes.data ?? [];
  const reprioritized = reprioritizeTasks(
    tasks.map((t: Task) => ({ ...t, critical_path_length: cpMap.get(t.id) ?? t.critical_path_length })),
    updatedBehaviors
  );

  for (const task of reprioritized) {
    const original = tasks.find((t: Task) => t.id === task.id);
    if (original && Math.abs(original.priority - task.priority) > 0.01) {
      await supabase
        .from('tasks')
        .update({ priority: task.priority })
        .eq('id', task.id);
      result.priorities_updated++;
    }
  }

  // ---- 5. Health check — trigger replan if needed ----
  const health = computeHealthScore(logs, userId);

  if (health.needs_replan) {
    const pendingTasks = reprioritized.filter(
      (t: Task) => t.status === 'pending' || t.status === 'ready'
    );

    const replanResult = replan({
      tasks: pendingTasks,
      behaviors: updatedBehaviors,
      health,
      availableMinutes: 240,
      failedTaskIds: tasks
        .filter((t: Task) => t.status === 'failed')
        .map((t: Task) => t.id),
    });

    // Apply replan actions
    for (const action of replanResult.actions) {
      if (!action.task_id) continue;
      const updates: any = {};
      if (action.type === 'boost_priority') updates.priority = action.new_value;
      if (action.type === 'compress_duration') updates.duration = action.new_value;
      if (action.type === 'drop_task') updates.status = 'skipped';

      if (Object.keys(updates).length > 0) {
        await supabase.from('tasks').update(updates).eq('id', action.task_id);
      }
    }

    result.replan_triggered = true;
  }

  // ---- 6. Update procrastination on overdue tasks ----
  const overdueTasks = tasks.filter((t: Task) => {
    return t.deadline &&
           new Date(t.deadline) < new Date() &&
           (t.status === 'pending' || t.status === 'ready');
  });

  for (const task of overdueTasks) {
    await supabase
      .from('tasks')
      .update({ priority: Math.min(1.0, task.priority + 0.15) })
      .eq('id', task.id);
  }
}
