// ============================================================
// Task Graph Executor
// getReadyTasks — Only allows execution when ALL deps are done
// ============================================================

import { Task, ReadyTask, DAGGraph } from '@/lib/types';

/**
 * Returns tasks that are ready to start:
 *   - Status is 'pending' or 'ready'
 *   - ALL dependencies have status 'done'
 *
 * This is the core enforcement of DAG correctness.
 */
export function getReadyTasks(tasks: Task[]): ReadyTask[] {
  const taskMap = new Map<string, Task>();
  for (const task of tasks) taskMap.set(task.id, task);

  const readyTasks: ReadyTask[] = [];

  for (const task of tasks) {
    if (task.status !== 'pending' && task.status !== 'ready') continue;

    const blockedBy: string[] = [];

    for (const depId of task.dependencies) {
      const dep = taskMap.get(depId);
      if (!dep || dep.status !== 'done') {
        blockedBy.push(depId);
      }
    }

    readyTasks.push({
      ...task,
      canStart: blockedBy.length === 0,
      blockedBy,
    });
  }

  // Sort ready tasks by priority descending (highest priority first)
  return readyTasks.sort((a, b) => {
    if (a.canStart && !b.canStart) return -1;
    if (!a.canStart && b.canStart) return 1;
    return b.priority - a.priority;
  });
}

/**
 * Get only the tasks that can immediately start (fully unblocked).
 */
export function getImmediatelyStartable(tasks: Task[]): Task[] {
  return getReadyTasks(tasks)
    .filter(t => t.canStart)
    .map(({ canStart, blockedBy, ...task }) => task);
}

/**
 * Check if a specific task can be started given current task states.
 */
export function canStartTask(taskId: string, tasks: Task[]): boolean {
  const taskMap = new Map<string, Task>();
  for (const t of tasks) taskMap.set(t.id, t);

  const task = taskMap.get(taskId);
  if (!task) return false;
  if (task.status !== 'pending' && task.status !== 'ready') return false;

  return task.dependencies.every(depId => {
    const dep = taskMap.get(depId);
    return dep?.status === 'done';
  });
}

/**
 * Compute execution waves — groups of tasks that can run in parallel
 * within each wave (all deps from previous waves are done).
 */
export function computeExecutionWaves(graph: DAGGraph, tasks: Task[]): string[][] {
  if (!graph.isValid) return [];

  const waves: string[][] = [];
  const assigned = new Set<string>();
  const topOrder = graph.topologicalOrder;

  // Wave 0: tasks with no dependencies
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const wave0 = topOrder.filter(id => {
    const node = graph.nodes.get(id);
    return node && node.parents.length === 0;
  });
  if (wave0.length > 0) {
    waves.push(wave0);
    wave0.forEach(id => assigned.add(id));
  }

  // Subsequent waves: tasks whose all parents are in previous waves
  while (assigned.size < topOrder.length) {
    const wave: string[] = [];
    for (const id of topOrder) {
      if (assigned.has(id)) continue;
      const node = graph.nodes.get(id);
      if (!node) continue;
      const allParentsAssigned = node.parents.every(p => assigned.has(p));
      if (allParentsAssigned) wave.push(id);
    }
    if (wave.length === 0) break; // Safety — shouldn't happen if no cycles
    wave.forEach(id => assigned.add(id));
    waves.push(wave);
  }

  return waves;
}
