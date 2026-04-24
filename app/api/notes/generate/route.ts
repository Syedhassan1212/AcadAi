import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AIService } from '@/lib/services/ai.service';

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { subtopic_ids = [] } = await request.json();

    if (!subtopic_ids.length) {
      return NextResponse.json({ error: 'At least one subtopic_id is required' }, { status: 400 });
    }

    // Fetch all selected subtopics with hierarchy
    const { data: subtopics } = await supabase
      .from('subtopics')
      .select('id, title, topics(title, subjects(title))')
      .in('id', subtopic_ids);

    if (!subtopics || subtopics.length === 0) {
      return NextResponse.json({ error: 'No subtopics found' }, { status: 404 });
    }

    const topicNames = subtopics.map((s: any) => s.title);
    const subjectName = (subtopics[0] as any).topics?.subjects?.title || 'General';
    const context = `Subject: ${subjectName}, Topics: ${topicNames.join(', ')}`;

    const content = await AIService.generateNotes(topicNames, context);

    if (content) {
      // Create a note for each subtopic or a combined note
      const title = topicNames.length === 1
        ? `${topicNames[0]} Study Guide`
        : `Combined Notes: ${topicNames.slice(0, 3).join(', ')}${topicNames.length > 3 ? '...' : ''}`;

      const { data: note } = await supabase.from('notes').insert({
        user_id: user.id,
        subtopic_id: subtopic_ids[0],
        title,
        content,
        tags: topicNames,
      }).select().single();

      return NextResponse.json({ success: true, note, content });
    }

    return NextResponse.json({ success: false, error: 'AI failed to generate notes' }, { status: 500 });
  } catch (err: any) {
    console.error('Notes generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
