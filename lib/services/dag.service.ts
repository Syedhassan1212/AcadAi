import { createClient } from '@/lib/supabase/server';

export class DAGService {
  /**
   * Sort subtopics using Kahn's algorithm based on subtopic_edges
   */
  static async getTopologicalSort(subjectId: string): Promise<string[]> {
    const supabase = await createClient();
    
    // 1. Fetch all subtopics for this subject
    // We do a join query using PostgREST syntax
    const { data: nodes } = await supabase
      .from('subtopics')
      .select('id, topics!inner(subject_id)')
      .eq('topics.subject_id', subjectId);
      
    if (!nodes || nodes.length === 0) return [];
    
    const nodeIds = nodes.map(n => n.id);

    // 2. Fetch edges
    const { data: edges } = await supabase
      .from('subtopic_edges')
      .select('from_subtopic_id, to_subtopic_id')
      .in('to_subtopic_id', nodeIds);

    // 3. Build Adjacency List & In-Degrees
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();

    for (const id of nodeIds) {
      inDegree.set(id, 0);
      adjList.set(id, []);
    }

    if (edges) {
      for (const edge of edges) {
        if (!inDegree.has(edge.to_subtopic_id)) continue;
        
        adjList.get(edge.from_subtopic_id)?.push(edge.to_subtopic_id);
        inDegree.set(edge.to_subtopic_id, (inDegree.get(edge.to_subtopic_id) || 0) + 1);
      }
    }

    // 4. Kahn's Sorting
    const queue: string[] = [];
    for (const [id, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(id);
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      order.push(id);

      const children = adjList.get(id) || [];
      for (const childId of children) {
        const currentDeg = inDegree.get(childId)! - 1;
        inDegree.set(childId, currentDeg);
        if (currentDeg === 0) queue.push(childId);
      }
    }
    return order;
  }

  /**
   * Fetch full graph data for visualization (Nodes, Edges, Progress)
   */
  static async getGraphData(subjectId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Fetch subtopics
    const { data: subtopics } = await supabase
      .from('subtopics')
      .select('id, title, difficulty, topics!inner(title, subject_id)')
      .eq('topics.subject_id', subjectId);

    if (!subtopics || subtopics.length === 0) return { nodes: [], edges: [] };
    const nodeIds = subtopics.map(s => s.id);

    // 2. Fetch edges
    const { data: edges } = await supabase
      .from('subtopic_edges')
      .select('*')
      .in('to_subtopic_id', nodeIds);

    // 3. Fetch progress for the current user
    const { data: progress } = await supabase
      .from('subtopic_progress')
      .select('*')
      .eq('user_id', user?.id)
      .in('subtopic_id', nodeIds);

    // Merge data into nodes
    const progressMap = new Map(progress?.map(p => [p.subtopic_id, p]));
    
    const nodes = subtopics.map(s => ({
      id: s.id,
      title: s.title,
      topic: (s.topics as any)?.title,
      difficulty: s.difficulty,
      completion: (progressMap.get(s.id) as any)?.completion || 0,
      mastery: (progressMap.get(s.id) as any)?.mastery_score || 0,
    }));

    return { nodes, edges: edges || [] };
  }

  /**
   * Get personalized study recommendations based on the global DAG
   * Finds nodes where prefixes are mastered but current node is not.
   */
  static async getRecommendedSubtopics(userId: string, limit: number = 3) {
    const supabase = await createClient();

    // 1. Fetch all subtopic progress for this user
    const { data: progress } = await supabase
      .from('subtopic_progress')
      .select('subtopic_id, mastery_score')
      .eq('user_id', userId);

    const masteryMap = new Map<string, number>(
      progress?.map(p => [p.subtopic_id, (p as any).mastery_score || 0]) || []
    );

    // 2. Fetch all subtopics and their subjects/topics for context
    const { data: subtopics } = await supabase
      .from('subtopics')
      .select('id, title, topic_id, topics!inner(title, subject_id, subjects!inner(title))');

    if (!subtopics) return [];

    // 3. Fetch all edges for dependency check
    const { data: edges } = await supabase
      .from('subtopic_edges')
      .select('from_subtopic_id, to_subtopic_id');

    const adj = new Map<string, string[]>();
    edges?.forEach(e => {
      if (!adj.has(e.to_subtopic_id)) adj.set(e.to_subtopic_id, []);
      adj.get(e.to_subtopic_id)!.push(e.from_subtopic_id);
    });

    // 4. Filter for "Ready but not Mastered"
    // Criteria: mastery < 0.8 and ALL prerequisites have mastery >= 0.8
    const recommendations = subtopics
      .filter(s => {
        const myMastery = (masteryMap.get(s.id) as number) || 0;
        if (myMastery >= 0.8) return false;

        const prerequisites = adj.get(s.id) || [];
        if (prerequisites.length === 0) return true; // Entry level node

        return prerequisites.every(pId => ((masteryMap.get(pId) as number) || 0) >= 0.8);
      })
      .map(s => ({
        id: s.id,
        title: s.title,
        topic: (s.topics as any)?.title,
        subject: (s.topics as any)?.subjects?.title,
        subjectId: (s.topics as any)?.subject_id,
        mastery: masteryMap.get(s.id) || 0
      }))
      .slice(0, limit);

    return recommendations;
  }
}
