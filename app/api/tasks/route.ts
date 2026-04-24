import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Task } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const topic = searchParams.get('topic');
    const limit = parseInt(searchParams.get('limit') ?? '100');

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: false })
      .limit(limit);

    if (status) query = query.eq('status', status);
    if (topic) query = query.eq('topic', topic);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ tasks: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title, topic, subtopic, description, duration, deadline, task_type, difficulty, dependencies } = body;

    if (!title || !topic) {
      return NextResponse.json({ error: 'title and topic are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        topic,
        subtopic,
        description,
        duration: Math.min(45, Math.max(5, duration ?? 30)),
        deadline,
        task_type: task_type ?? 'learn',
        difficulty: difficulty ?? 0.5,
        dependencies: dependencies ?? [],
        status: (dependencies ?? []).length === 0 ? 'ready' : 'pending',
        priority: 0.5,
        success_rate: 1.0,
        critical_path_length: duration ?? 30,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
