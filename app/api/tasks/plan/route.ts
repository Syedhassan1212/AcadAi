import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getImmediatelyStartable } from '@/lib/dag/executor';
import { generateDailyPlan } from '@/lib/scheduler/priority';
import { Task, UserBehavior } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0];
    const hours = parseFloat(searchParams.get('hours') ?? '4');

    // Check for existing plan
    const { data: existing } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single();

    if (existing && !searchParams.get('regenerate')) {
      return NextResponse.json({ plan: existing, from_cache: true });
    }

    // Fetch data
    const [tasksRes, behaviorsRes, allTasksRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id).in('status', ['pending', 'ready']),
      supabase.from('user_behavior').select('*').eq('user_id', user.id),
      supabase.from('tasks').select('*').eq('user_id', user.id),
    ]);

    const tasks: Task[] = tasksRes.data ?? [];
    const behaviors: UserBehavior[] = behaviorsRes.data ?? [];
    const allTasks: Task[] = allTasksRes.data ?? [];

    const readyTasks = getImmediatelyStartable(tasks);
    const plan = generateDailyPlan(readyTasks, allTasks, behaviors, hours * 60, date);

    // Save or update plan
    const { data: savedPlan, error: saveErr } = await supabase
      .from('study_plans')
      .upsert({ ...plan, user_id: user.id })
      .select()
      .single();

    if (saveErr) console.error('Plan save error:', saveErr);

    return NextResponse.json({ plan: savedPlan ?? plan, from_cache: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
