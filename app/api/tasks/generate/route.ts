import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AIService } from '@/lib/services/ai.service';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { subtopic_id } = await request.json();

    // Fetch subtopic details
    const { data: subtopic } = await supabase
      .from('subtopics')
      .select('title, topics(title, subjects(title))')
      .eq('id', subtopic_id)
      .single();

    if (!subtopic) return NextResponse.json({ error: 'Subtopic not found' }, { status: 404 });

    // Build context string
    const context = `Subject: ${(subtopic as any).topics?.subjects?.title}, Topic: ${(subtopic as any).topics?.title}`;

    // Call isolated AI service
    const tasks = await AIService.generateTasks(subtopic.title, context);

    // Insert into DB
    if (tasks.length > 0) {
      const inserts = tasks.map((t: any) => ({
        user_id: user.id,
        subtopic_id: subtopic_id,
        title: t.title,
        estimated_time: t.estimated_time,
        difficulty: t.difficulty === 'hard' ? 0.9 : t.difficulty === 'medium' ? 0.6 : 0.3,
        status: 'pending',
        task_type: t.task_type
      }));

      await supabase.from('tasks').insert(inserts);
    }

    return NextResponse.json({ success: true, tasksGenerated: tasks.length });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
