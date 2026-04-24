// ============================================================
// Health Monitor — CUSUM-like trend detection
// Detects failure/time drift over last N logs (not single spikes)
// ============================================================

import { TaskLog, HealthReport } from '@/lib/types';

const WINDOW_SIZE = 15;      // Number of logs to analyze
const RECENCY_DECAY = 0.85;  // Weight decay for older logs (recent = higher weight)
const HEALTH_THRESHOLD = 0.4;

interface TrendResult {
  trend: number;        // positive = worsening, negative = improving
  weightedFailureRate: number;
  weightedAvgTime: number;
  recentLogs: TaskLog[];
}

/**
 * Compute weighted failure trend over last N logs.
 * Recent logs weighted higher via exponential decay.
 */
function computeTrend(logs: TaskLog[]): TrendResult {
  if (logs.length === 0) {
    return { trend: 0, weightedFailureRate: 0, weightedAvgTime: 30, recentLogs: [] };
  }

  // Sort by created_at desc, take window
  const sorted = [...logs]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, WINDOW_SIZE);

  let weightSum = 0;
  let weightedFailures = 0;
  let weightedTime = 0;
  let weightedTimeSum = 0;

  sorted.forEach((log, index) => {
    // Most recent = index 0 = weight 1.0, older = lower weight
    const weight = Math.pow(RECENCY_DECAY, index);
    weightSum += weight;

    if (!log.completed) {
      weightedFailures += weight;
    }

    if (log.actual_time !== undefined && log.actual_time !== null) {
      weightedTime += log.actual_time * weight;
      weightedTimeSum += weight;
    }
  });

  const weightedFailureRate = weightSum > 0 ? weightedFailures / weightSum : 0;
  const weightedAvgTime = weightedTimeSum > 0 ? weightedTime / weightedTimeSum : 30;

  // Trend: compare first half vs second half of window (both recency-weighted)
  const midpoint = Math.floor(sorted.length / 2);
  const recentHalf = sorted.slice(0, midpoint);
  const olderHalf = sorted.slice(midpoint);

  const recentFailRate = recentHalf.length > 0
    ? recentHalf.filter(l => !l.completed).length / recentHalf.length
    : 0;
  const olderFailRate = olderHalf.length > 0
    ? olderHalf.filter(l => !l.completed).length / olderHalf.length
    : 0;

  // Positive trend = failure rate is increasing (worsening)
  const trend = recentFailRate - olderFailRate;

  return { trend, weightedFailureRate, weightedAvgTime, recentLogs: sorted };
}

/**
 * Compute time trend — are tasks taking longer recently?
 */
function computeTimeTrend(logs: TaskLog[], typicalDuration: number): number {
  const timedLogs = logs.filter(l => l.actual_time !== undefined && l.completed)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, WINDOW_SIZE);

  if (timedLogs.length < 3) return 0;

  const midpoint = Math.floor(timedLogs.length / 2);
  const recentAvg = timedLogs.slice(0, midpoint).reduce((s, l) => s + (l.actual_time ?? 0), 0) / midpoint;
  const olderAvg = timedLogs.slice(midpoint).reduce((s, l) => s + (l.actual_time ?? 0), 0) / (timedLogs.length - midpoint);

  // Normalised time trend: 0 = no change, positive = taking longer
  return olderAvg > 0 ? (recentAvg - olderAvg) / olderAvg : 0;
}

/**
 * Main health monitor function.
 *
 * health_score ∈ [0, 1]
 *   1.0 = perfect (100% completion, consistent time)
 *   0.0 = critical decline
 *
 * health_score = 1 - (0.6 * failure_rate + 0.4 * time_overrun_rate)
 *
 * Triggers replan if health_score < HEALTH_THRESHOLD
 */
export function computeHealthScore(
  logs: TaskLog[],
  userId: string,
  topicAvgDurations?: Map<string, number>
): HealthReport {
  const { trend, weightedFailureRate, weightedAvgTime, recentLogs } = computeTrend(logs);
  const timeTrend = computeTimeTrend(logs, 30);

  // Time overrun rate: what fraction of tasks took significantly longer?
  const avgDuration = topicAvgDurations
    ? Array.from(topicAvgDurations.values()).reduce((s, v) => s + v, 0) / topicAvgDurations.size
    : 30;
  const timeOverrunRate = Math.min(1, Math.max(0, (weightedAvgTime - avgDuration) / avgDuration));

  const health_score = Math.min(1, Math.max(0,
    1 - (0.6 * weightedFailureRate + 0.4 * Math.max(0, timeOverrunRate))
  ));

  // Find struggling topics
  const topicFailMap = new Map<string, { fails: number; total: number }>();
  // (topic info not in TaskLog natively — group by task_id prefix if available)
  // Using log frequency analysis instead
  const failingLogs = recentLogs.filter(l => !l.completed);
  const topicIds = [...new Set(failingLogs.map(l => l.task_id))];

  const recommendation = buildRecommendation(health_score, trend, timeTrend, weightedFailureRate);

  return {
    user_id: userId,
    health_score,
    failure_trend: trend,
    time_trend: timeTrend,
    needs_replan: health_score < HEALTH_THRESHOLD || trend > 0.3,
    top_struggling_topics: topicIds.slice(0, 3),
    recommendation,
    computed_at: new Date().toISOString(),
  };
}

function buildRecommendation(
  score: number,
  failureTrend: number,
  timeTrend: number,
  failRate: number
): string {
  if (score > 0.8) return 'Excellent progress! Keep your current pace.';
  if (score > 0.6 && failureTrend < 0) return 'Good recovery trend. Maintain current strategy.';
  if (failureTrend > 0.3) return 'Failure trend detected. Consider reducing session length and simplifying tasks.';
  if (timeTrend > 0.4) return 'Tasks are taking significantly longer than planned. Consider breaking them into smaller chunks.';
  if (failRate > 0.6) return 'High failure rate. Replanning recommended — focus on foundational tasks first.';
  if (score < 0.4) return 'Critical decline detected. Immediate replanning required. Start with the easiest incomplete tasks.';
  return 'Moderate performance. Consider revising weak topics and adjusting workload.';
}

/**
 * Detect burnout risk from log patterns.
 * Signs: many sessions in short time, consistently long times, declining success.
 */
export function detectBurnoutRisk(logs: TaskLog[]): number {
  if (logs.length < 5) return 0;

  const last7Days = logs.filter(l => {
    const age = Date.now() - new Date(l.created_at).getTime();
    return age < 7 * 24 * 60 * 60 * 1000;
  });

  // High session density + low completion = burnout signal
  const sessionDensity = Math.min(1, last7Days.length / 20); // 20 sessions/week = high
  const failRate = last7Days.length > 0
    ? last7Days.filter(l => !l.completed).length / last7Days.length
    : 0;

  return Math.min(1, (sessionDensity * 0.4 + failRate * 0.6));
}
