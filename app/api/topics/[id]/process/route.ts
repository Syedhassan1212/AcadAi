import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AIService } from '@/lib/services/ai.service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: topicId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Fetch Topic to get Title
    const { data: topic } = await supabase
      .from('topics')
      .select('title')
      .eq('id', topicId)
      .single();

    if (!topic) return NextResponse.json({ error: 'Topic not found' }, { status: 404 });

    // 2. Extract Subtopics with Scoped AI
    const subtopics = await AIService.extractSubtopicsForTopic(buffer, file.type, topic.title);

    // 3. Batch Insert Subtopics (Appending to existing ones)
    const subtopicNameToId = new Map<string, string>();
    const inserts = subtopics.map(s => ({
      topic_id: topicId,
      title: s.title,
      summary: s.summary,
      difficulty: s.difficulty || 0.5
    }));

    const { data: insertedSubs, error: insertError } = await supabase
      .from('subtopics')
      .insert(inserts)
      .select();

    if (insertError) throw insertError;

    // 4. Map edges for new subtopics
    insertedSubs?.forEach((s: any) => subtopicNameToId.set(s.title.toLowerCase(), s.id));
    
    const edgeInserts: { from_subtopic_id: string; to_subtopic_id: string }[] = [];
    for (const aiSub of subtopics) {
      if (aiSub.dependencies && Array.isArray(aiSub.dependencies)) {
        const toId = subtopicNameToId.get(aiSub.title.toLowerCase());
        for (const depName of aiSub.dependencies) {
          const fromId = subtopicNameToId.get(depName.toLowerCase());
          if (fromId && toId && fromId !== toId) {
            edgeInserts.push({ from_subtopic_id: fromId, to_subtopic_id: toId });
          }
        }
      }
    }

    if (edgeInserts.length > 0) {
      await supabase.from('subtopic_edges').insert(edgeInserts);
    }

    return NextResponse.json({
        success: true,
        subtopicsCreated: subtopics.length,
        dependenciesCreated: edgeInserts.length
    });

  } catch (err: any) {
    console.error('Topic processing error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
