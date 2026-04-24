import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getReadyTasks } from '@/lib/dag/executor';
import { Task } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['pending', 'ready']);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const readyTasks = getReadyTasks(tasks ?? []);

    return NextResponse.json({
      ready: readyTasks.filter(t => t.canStart),
      blocked: readyTasks.filter(t => !t.canStart),
      total_ready: readyTasks.filter(t => t.canStart).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
