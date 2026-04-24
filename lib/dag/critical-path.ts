// ============================================================
// Critical Path Calculator
// Uses bottom-up DP over the DAG
// ============================================================

import { DAGNode, DAGGraph, Task } from '@/lib/types';

/**
 * Compute critical_path_length for each node.
 *
 * critical_path_length(node) =
 *   node.task.duration + max(critical_path_length(child) for each child)
 *
 * We process nodes in reverse topological order so children are
 * computed before parents.
 */
export function computeCriticalPaths(graph: DAGGraph): Map<string, number> {
  const cpMap = new Map<string, number>();

  if (!graph.isValid || graph.topologicalOrder.length === 0) {
    // Return zeros if graph has cycles or is empty
    for (const id of graph.nodes.keys()) cpMap.set(id, 0);
    return cpMap;
  }

  // Process in reverse topological order (leaves first)
  const reversed = [...graph.topologicalOrder].reverse();

  for (const id of reversed) {
    const node = graph.nodes.get(id)!;
    const duration = node.task.duration;

    if (node.children.length === 0) {
      // Leaf node — no children to wait for
      cpMap.set(id, duration);
    } else {
      const maxChildCP = Math.max(
        ...node.children.map(childId => cpMap.get(childId) ?? 0)
      );
      cpMap.set(id, duration + maxChildCP);
    }
  }

  return cpMap;
}

/**
 * Find the critical path — the longest chain from a given start node.
 * Returns the sequence of task IDs forming the critical path.
 */
export function findCriticalPath(
  startId: string,
  graph: DAGGraph,
  cpMap: Map<string, number>
): string[] {
  const path: string[] = [startId];
  let current = startId;

  while (true) {
    const node = graph.nodes.get(current);
    if (!node || node.children.length === 0) break;

    // Pick the child with the highest critical path length
    let bestChild = '';
    let bestCP = -1;
    for (const childId of node.children) {
      const cp = cpMap.get(childId) ?? 0;
      if (cp > bestCP) {
        bestCP = cp;
        bestChild = childId;
      }
    }

    if (!bestChild) break;
    path.push(bestChild);
    current = bestChild;
  }

  return path;
}

/**
 * Update tasks array with their computed critical_path_length values.
 */
export function annotateCriticalPaths(
  tasks: Task[],
  graph: DAGGraph
): Task[] {
  const cpMap = computeCriticalPaths(graph);
  return tasks.map(task => ({
    ...task,
    critical_path_length: cpMap.get(task.id) ?? task.duration,
  }));
}
