import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date().toISOString();
    const next24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data: dueSoonTasks } = await supabase
      .from('tasks')
      .select('id, title, deadline')
      .eq('user_id', user.id)
      .in('status', ['ready', 'in_progress', 'pending'])
      .gte('deadline', now)
      .lte('deadline', next24h)
      .order('deadline', { ascending: true })
      .limit(5);

    const notifications = (dueSoonTasks || []).map((task) => ({
      id: `deadline-${task.id}`,
      title: 'Deadline warning',
      message: `${task.title} is due within 24h.`,
      createdAt: now,
    }));

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Notification API error', error);
    return NextResponse.json({ error: 'Failed to load notifications' }, { status: 500 });
  }
}
