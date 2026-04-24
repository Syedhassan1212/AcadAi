import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Verify ownership
    const { data: subject } = await supabase
      .from('subjects')
      .select('id, title')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!subject) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Fetch counts in parallel
    const [topicsRes, docsRes, notesRes, quizzesRes] = await Promise.all([
      supabase.from('topics').select('id, subtopics(id)').eq('subject_id', id),
      supabase.from('uploaded_files').select('id').eq('user_id', user.id),
      supabase.from('notes').select('id').eq('user_id', user.id),
      supabase.from('quizzes').select('id').eq('user_id', user.id),
    ]);

    const topics = topicsRes.data || [];
    const subtopicCount = topics.reduce((sum: number, t: any) => sum + (t.subtopics?.length || 0), 0);

    return NextResponse.json({
      subject: subject.title,
      topicCount: topics.length,
      subtopicCount,
      documentCount: docsRes.data?.length || 0,
      noteCount: notesRes.data?.length || 0,
      quizCount: quizzesRes.data?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
