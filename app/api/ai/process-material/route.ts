import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AIService } from '@/lib/services/ai.service';
import { DAGService } from '@/lib/services/dag.service';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;
    const existingSubjectId = formData.get('subject_id') as string | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // 1. Process Material with AI Service
    const hierarchy = await AIService.extractHierarchy(buffer, file.type);
    
    if (!hierarchy.subject || !hierarchy.topics) {
      return NextResponse.json({ error: 'Failed to extract strict hierarchy' }, { status: 500 });
    }

    let subjectId = existingSubjectId;
    if (subjectId) {
      const { data: existingSubject } = await supabase
        .from('subjects')
        .select('id')
        .eq('id', subjectId)
        .eq('user_id', user.id)
        .single();
      if (!existingSubject) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }
    } else {
      const { data: subjectData } = await supabase
        .from('subjects')
        .insert({ user_id: user.id, title: hierarchy.subject, name: hierarchy.subject })
        .select()
        .single();
      subjectId = subjectData!.id;
    }
    const subtopicNameToId = new Map<string, string>();

    // 3. Insert Topics and Subtopics
    for (const topic of hierarchy.topics) {
      const { data: topicData } = await supabase
        .from('topics')
        .insert({ subject_id: subjectId, title: topic.title })
        .select().single();

      for (const sub of topic.subtopics) {
        const { data: subData } = await supabase
          .from('subtopics')
          .insert({ topic_id: topicData!.id, title: sub.title, difficulty: sub.difficulty })
          .select().single();
        
        subtopicNameToId.set(sub.title.toLowerCase(), subData!.id);
        
        // Temporarily store dependencies to map edges later
        (sub as any)._tempId = subData!.id;
      }
    }

    // 4. Insert Edges (DAG)
    const edgeInserts: { from_subtopic_id: string; to_subtopic_id: string }[] = [];
    for (const topic of hierarchy.topics) {
      for (const sub of topic.subtopics) {
        if (sub.dependencies && Array.isArray(sub.dependencies)) {
          for (const depName of sub.dependencies) {
            const depId = subtopicNameToId.get(depName.toLowerCase());
            if (depId && depId !== (sub as any)._tempId) {
              edgeInserts.push({
                from_subtopic_id: depId,
                to_subtopic_id: (sub as any)._tempId
              });
            }
          }
        }
      }
    }

    if (edgeInserts.length > 0) {
      await supabase.from('subtopic_edges').insert(edgeInserts);
    }

    // 5. Generate DAG Sorting
    const sortedNodeOrder = await DAGService.getTopologicalSort(subjectId!);

    return NextResponse.json({ 
      success: true, 
      subjectId,
      topicsCreated: hierarchy.topics.length,
      subtopicsCreated: hierarchy.topics.reduce((sum: number, t: any) => sum + (t.subtopics?.length || 0), 0),
      dependenciesCreated: edgeInserts.length,
      topologicalOrder: sortedNodeOrder 
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
