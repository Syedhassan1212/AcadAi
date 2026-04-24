import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeHealthScore } from '@/lib/health/monitor';
import { replan, applyReplanToDb } from '@/lib/replanning/engine';
import { Task, TaskLog, UserBehavior } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { failed_task_ids, available_minutes } = body;

    const [tasksRes, logsRes, behaviorsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id),
      supabase.from('task_logs').select('*').eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('user_behavior').select('*').eq('user_id', user.id),
    ]);

    const tasks: Task[] = tasksRes.data ?? [];
    const logs: TaskLog[] = logsRes.data ?? [];
    const behaviors: UserBehavior[] = behaviorsRes.data ?? [];

    const health = computeHealthScore(logs, user.id);
    const pendingTasks = tasks.filter(
      t => t.status === 'pending' || t.status === 'ready' || t.status === 'failed'
    );

    const result = replan({
      tasks: pendingTasks,
      behaviors,
      health,
      availableMinutes: available_minutes ?? 240,
      failedTaskIds: failed_task_ids ?? tasks.filter(t => t.status === 'failed').map(t => t.id),
    });

    // Apply to database
    const updated = await applyReplanToDb(result, tasks, supabase);

    return NextResponse.json({
      success: true,
      health_score: health.health_score,
      actions_taken: result.actions.length,
      tasks_updated: updated,
      tasks_dropped: result.dropped_tasks.length,
      actions: result.actions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
