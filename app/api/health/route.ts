import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeHealthScore } from '@/lib/health/monitor';
import { Task, TaskLog } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: logs, error } = await supabase
      .from('task_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get avg durations per topic for context
    const { data: tasks } = await supabase
      .from('tasks')
      .select('topic, duration')
      .eq('user_id', user.id);

    const topicAvgDurations = new Map<string, number>();
    const topicGroups = new Map<string, number[]>();
    for (const t of (tasks ?? [])) {
      if (!topicGroups.has(t.topic)) topicGroups.set(t.topic, []);
      topicGroups.get(t.topic)!.push(t.duration);
    }
    for (const [topic, durations] of topicGroups) {
      topicAvgDurations.set(topic, durations.reduce((s, d) => s + d, 0) / durations.length);
    }

    const health = computeHealthScore(logs ?? [], user.id, topicAvgDurations);

    // Enrich with topic names for struggling topics
    const taskMap = new Map((tasks ?? []).map((t: any) => [t.id, t]));

    return NextResponse.json({ health });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
