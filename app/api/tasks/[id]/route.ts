import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    // Allowed fields to update
    const allowedFields = ['status', 'priority', 'duration', 'deadline', 'title', 'description', 'difficulty', 'task_type'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // If marking as done, log the completion
    if (updates.status === 'done' || updates.status === 'failed') {
      const { data: task } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (task) {
        // Insert task log
        await supabase.from('task_logs').insert({
          task_id: id,
          user_id: user.id,
          completed: updates.status === 'done',
          actual_time: body.actual_time ?? task.duration,
          difficulty_felt: body.difficulty_felt,
          notes: body.notes,
        });

        // Update success_rate with EMA
        const alpha = 0.3;
        const newSuccess = updates.status === 'done' ? 1 : 0;
        updates.success_rate = (1 - alpha) * task.success_rate + alpha * newSuccess;
        updates.avg_time = body.actual_time
          ? (task.avg_time ? (1 - alpha) * task.avg_time + alpha * body.actual_time : body.actual_time)
          : task.avg_time;
        updates.attempt_count = (task.attempt_count ?? 0) + 1;

        // If failed, reset status to pending for retry (unless explicitly skipped)
        if (updates.status === 'failed') {
          // Keep as failed for health monitor to detect
          // Will be reset to ready by replan engine
        }
      }
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
