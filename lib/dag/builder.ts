// ============================================================
// DAG Builder
// Converts Gemini-extracted topics → dependency-aware task graph
// ============================================================

import { Task, DAGNode, DAGGraph, GeminiTaskOutput } from '@/lib/types';

/**
 * Build a DAG from an array of tasks stored in the database.
 * Each task's `dependencies` field contains the UUIDs of tasks
 * that must complete before this one can start.
 */
export function buildDAG(tasks: Task[]): DAGGraph {
  const nodes = new Map<string, DAGNode>();

  // Initialize all nodes
  for (const task of tasks) {
    nodes.set(task.id, {
      id: task.id,
      task,
      children: [],
      parents: [...task.dependencies],
      critical_path_length: 0,
      depth: 0,
    });
  }

  // Wire up children pointers (reverse of parent pointer)
  for (const node of nodes.values()) {
    for (const parentId of node.parents) {
      const parent = nodes.get(parentId);
      if (parent && !parent.children.includes(node.id)) {
        parent.children.push(node.id);
      }
    }
  }

  // Validate — detect cycles
  const { isValid, cycles } = detectCycles(nodes);

  // Topological order (Kahn's algorithm)
  const topologicalOrder = isValid ? kahnSort(nodes) : [];

  // Assign depths
  for (const id of topologicalOrder) {
    const node = nodes.get(id)!;
    for (const childId of node.children) {
      const child = nodes.get(childId)!;
      child.depth = Math.max(child.depth, node.depth + 1);
    }
  }

  return { nodes, topologicalOrder, isValid, cycles };
}

/**
 * Cycle detection using DFS coloring.
 * WHITE=0 (unvisited), GRAY=1 (in stack), BLACK=2 (done)
 */
export function detectCycles(nodes: Map<string, DAGNode>): {
  isValid: boolean;
  cycles: string[][];
} {
  const color = new Map<string, 0 | 1 | 2>();
  const cycles: string[][] = [];

  for (const id of nodes.keys()) color.set(id, 0);

  function dfs(id: string, path: string[]): boolean {
    color.set(id, 1);
    path.push(id);

    const node = nodes.get(id);
    if (!node) return false;

    for (const childId of node.children) {
      if (color.get(childId) === 1) {
        // Found cycle — extract the cycle portion of path
        const cycleStart = path.indexOf(childId);
        cycles.push(path.slice(cycleStart));
        return true;
      }
      if (color.get(childId) === 0) {
        if (dfs(childId, [...path])) return true;
      }
    }

    color.set(id, 2);
    return false;
  }

  for (const id of nodes.keys()) {
    if (color.get(id) === 0) {
      dfs(id, []);
    }
  }

  return { isValid: cycles.length === 0, cycles };
}

/**
 * Kahn's topological sort algorithm.
 * Returns ids in execution order (dependencies first).
 */
function kahnSort(nodes: Map<string, DAGNode>): string[] {
  const inDegree = new Map<string, number>();
  for (const node of nodes.values()) {
    if (!inDegree.has(node.id)) inDegree.set(node.id, 0);
    for (const childId of node.children) {
      inDegree.set(childId, (inDegree.get(childId) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    const node = nodes.get(id)!;
    for (const childId of node.children) {
      const newDeg = (inDegree.get(childId) ?? 1) - 1;
      inDegree.set(childId, newDeg);
      if (newDeg === 0) queue.push(childId);
    }
  }

  return order;
}

/**
 * Convert Gemini task output to dependency-resolving task objects.
 * Resolves `dependencies_hint` (topic/subtopic strings) → actual task IDs.
 */
export function resolveGeminiDependencies(
  geminiTasks: GeminiTaskOutput[],
  userId: string
): Omit<Task, 'id' | 'created_at' | 'updated_at'>[] {
  // Build label → index map for hint resolution
  const labelMap = new Map<string, number>();
  geminiTasks.forEach((t, i) => {
    labelMap.set(t.title.toLowerCase(), i);
    if (t.subtopic) labelMap.set(t.subtopic.toLowerCase(), i);
    labelMap.set(t.topic.toLowerCase(), i);
  });

  // Placeholder IDs for temp resolution (actual UUIDs assigned by DB)
  const tempIds = geminiTasks.map(() => crypto.randomUUID());

  return geminiTasks.map((gt, i) => {
    const depIds: string[] = [];
    for (const hint of gt.dependencies_hint ?? []) {
      const idx = labelMap.get(hint.toLowerCase());
      if (idx !== undefined && idx !== i) {
        depIds.push(tempIds[idx]);
      }
    }

    return {
      user_id: userId,
      title: gt.title,
      topic: gt.topic,
      subtopic: gt.subtopic,
      description: gt.description,
      duration: Math.min(45, Math.max(5, gt.estimated_time || 30)),
      priority: 0.5,
      dependencies: depIds,
      status: 'pending' as const,
      task_type: gt.task_type,
      difficulty: gt.difficulty === 'hard' ? 0.9 : gt.difficulty === 'medium' ? 0.6 : 0.3,
      success_rate: 1.0,
      avg_time: undefined,
      critical_path_length: 0,
      attempt_count: 0,
    };
  });
}
