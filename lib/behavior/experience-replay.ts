// ============================================================
// Experience Replay Engine
// Mines task_logs for success/failure patterns
// Updates user_behavior vectors
// ============================================================

import { TaskLog, Task, UserBehavior, ExperiencePattern, TaskType, PreferredType } from '@/lib/types';

const ROLLING_ALPHA = 0.3;  // EMA alpha for rolling average updates

/**
 * Update user behavior vector for a topic based on new task logs.
 * Uses Exponential Moving Average to smoothly integrate new observations.
 */
export function replayAndUpdateBehavior(
  currentBehavior: UserBehavior,
  recentLogs: TaskLog[],
  tasksMap: Map<string, Task>
): Partial<UserBehavior> {
  if (recentLogs.length === 0) return {};

  // Filter logs to this topic
  const topicLogs = recentLogs.filter(log => {
    const task = tasksMap.get(log.task_id);
    return task?.topic === currentBehavior.topic;
  });

  if (topicLogs.length === 0) return {};

  // Compute new success rate
  const newSuccessRate = topicLogs.filter(l => l.completed).length / topicLogs.length;

  // EMA: blend new observation with current value
  const updated_success_rate = (1 - ROLLING_ALPHA) * currentBehavior.success_rate
    + ROLLING_ALPHA * newSuccessRate;

  // Compute avg session time
  const timedLogs = topicLogs.filter(l => l.actual_time !== undefined && l.completed);
  const updated_avg_time = timedLogs.length > 0
    ? (1 - ROLLING_ALPHA) * currentBehavior.avg_session_time
      + ROLLING_ALPHA * (timedLogs.reduce((s, l) => s + (l.actual_time ?? 0), 0) / timedLogs.length)
    : currentBehavior.avg_session_time;

  // Procrastination index: ratio of failed/incomplete sessions over total
  const procrastinationEvents = topicLogs.filter(l => !l.completed).length;
  const new_procrastination = topicLogs.length > 0 ? procrastinationEvents / topicLogs.length : 0;
  const updated_procrastination = (1 - ROLLING_ALPHA) * currentBehavior.procrastination_index
    + ROLLING_ALPHA * new_procrastination;

  // Consistency score: how regularly sessions happen (based on time gaps)
  const consistency = computeConsistencyScore(topicLogs);
  const updated_consistency = (1 - ROLLING_ALPHA) * currentBehavior.consistency_score
    + ROLLING_ALPHA * consistency;

  // Preferred task type: most common type among completed tasks
  const tasksForLogs = topicLogs
    .filter(l => l.completed)
    .map(l => tasksMap.get(l.task_id))
    .filter(Boolean) as Task[];

  const typeCounts = new Map<TaskType, number>();
  for (const t of tasksForLogs) {
    typeCounts.set(t.task_type, (typeCounts.get(t.task_type) ?? 0) + 1);
  }
  const PREFERRED_TYPES: PreferredType[] = ['learn', 'practice', 'review', 'quiz'];
  const preferred_type: PreferredType = typeCounts.size > 0
    ? (() => {
        const best = ([...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]) as string;
        return (PREFERRED_TYPES.includes(best as PreferredType) ? best : 'learn') as PreferredType;
      })()
    : currentBehavior.preferred_type;

  // Burnout risk
  const burnout_risk = computeBurnoutRisk(topicLogs, updated_procrastination);

  return {
    success_rate: Math.min(1, Math.max(0, updated_success_rate)),
    avg_session_time: Math.max(5, updated_avg_time),
    procrastination_index: Math.min(1, Math.max(0, updated_procrastination)),
    consistency_score: Math.min(1, Math.max(0, updated_consistency)),
    preferred_type,
    burnout_risk: Math.min(1, Math.max(0, burnout_risk)),
    total_sessions: currentBehavior.total_sessions + topicLogs.length,
    last_session_at: topicLogs
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at,
  };
}

/**
 * Mine experience patterns from logs grouped by topic.
 * Returns actionable patterns for task generation hints.
 */
export function mineExperiencePatterns(
  logs: TaskLog[],
  tasksMap: Map<string, Task>
): Map<string, ExperiencePattern> {
  const patterns = new Map<string, ExperiencePattern>();

  // Group logs by topic
  const topicLogs = new Map<string, { log: TaskLog; task: Task }[]>();
  for (const log of logs) {
    const task = tasksMap.get(log.task_id);
    if (!task) continue;
    if (!topicLogs.has(task.topic)) topicLogs.set(task.topic, []);
    topicLogs.get(task.topic)!.push({ log, task });
  }

  for (const [topic, entries] of topicLogs) {
    const successEntries = entries.filter(e => e.log.completed);
    const failEntries = entries.filter(e => !e.log.completed);

    // Best task type by success rate
    const typeSuccess = new Map<TaskType, number>();
    const typeTotal = new Map<TaskType, number>();
    for (const { log, task } of entries) {
      const t = task.task_type;
      typeTotal.set(t, (typeTotal.get(t) ?? 0) + 1);
      if (log.completed) typeSuccess.set(t, (typeSuccess.get(t) ?? 0) + 1);
    }

    let bestType: TaskType = 'learn';
    let bestRate = 0;
    for (const [type, total] of typeTotal) {
      const rate = (typeSuccess.get(type) ?? 0) / total;
      if (rate > bestRate) { bestRate = rate; bestType = type; }
    }

    // Optimal duration: average from successful sessions
    const avgSuccessDuration = successEntries.length > 0
      ? successEntries.reduce((s, e) => s + e.task.duration, 0) / successEntries.length
      : 30;

    // Time of day performance (hour 0-23 → success rate)
    const hourPerf: Record<string, number> = {};
    for (const { log } of successEntries) {
      const hour = new Date(log.created_at).getHours().toString();
      hourPerf[hour] = (hourPerf[hour] ?? 0) + 1;
    }

    patterns.set(topic, {
      topic,
      success_contexts: successEntries.slice(0, 5).map(e => e.task.title),
      failure_contexts: failEntries.slice(0, 5).map(e => e.task.title),
      best_task_type: bestType,
      optimal_duration: Math.round(avgSuccessDuration),
      time_of_day_performance: hourPerf,
    });
  }

  return patterns;
}

// -------------------- Helpers --------------------

function computeConsistencyScore(logs: TaskLog[]): number {
  if (logs.length < 2) return 0.5;

  const sorted = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = (new Date(sorted[i].created_at).getTime() -
                 new Date(sorted[i - 1].created_at).getTime()) / (1000 * 60 * 60 * 24);
    gaps.push(gap);
  }

  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  const variance = gaps.reduce((s, g) => s + Math.pow(g - avgGap, 2), 0) / gaps.length;

  // Low variance + regular intervals = high consistency
  const consistencyScore = Math.max(0, 1 - Math.min(1, variance / 10));
  return consistencyScore;
}

function computeBurnoutRisk(logs: TaskLog[], procrastination: number): number {
  const last7 = logs.filter(l => {
    const age = (Date.now() - new Date(l.created_at).getTime()) / (1000 * 60 * 60 * 24);
    return age <= 7;
  });

  const density = Math.min(1, last7.length / 15);
  const failRate = last7.length > 0
    ? last7.filter(l => !l.completed).length / last7.length
    : 0;

  return density * 0.3 + failRate * 0.4 + procrastination * 0.3;
}
