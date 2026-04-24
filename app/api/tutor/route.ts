import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildTutorSystemPrompt } from '@/lib/gemini/prompts';
import { StudyPlan, TutorMessage } from '@/lib/types';
import { computeHealthScore } from '@/lib/health/monitor';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      message,
      history = [],
      subject_id,
      topic_ids = [],
    }: {
      message: string;
      history: TutorMessage[];
      subject_id?: string;
      topic_ids?: string[];
    } = await req.json();

    if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    // Gather full user context in parallel
    const today = new Date().toISOString().split('T')[0];
    const contextQueries: any[] = [
      supabase.from('tasks').select('*').eq('user_id', user.id)
        .in('status', ['pending', 'ready']).order('priority', { ascending: false }).limit(10),
      supabase.from('user_behavior').select('*').eq('user_id', user.id),
      supabase.from('task_logs').select('*').eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('study_plans').select('*').eq('user_id', user.id).eq('date', today).single(),
    ];

    // If subject context is provided, fetch subject-specific data
    let subjectContext = '';
    if (subject_id) {
      contextQueries.push(
        supabase.from('subjects').select('title').eq('id', subject_id).single()
      );
      if (topic_ids.length > 0) {
        contextQueries.push(
          supabase.from('subtopics').select('title, difficulty')
            .in('id', topic_ids)
        );
      }
    }

    const results = await Promise.all(contextQueries);
    const [tasksRes, behaviorsRes, logsRes, planRes] = results;

    // Build subject context string
    if (subject_id && results[4]?.data) {
      subjectContext = `\nCURRENT SUBJECT: ${results[4].data.title}`;
      if (topic_ids.length > 0 && results[5]?.data) {
        const topicNames = results[5].data.map((t: any) => t.title);
        subjectContext += `\nSELECTED TOPICS: ${topicNames.join(', ')}`;
      }
    }

    const health = computeHealthScore(logsRes.data ?? [], user.id);
    const systemPrompt = buildTutorSystemPrompt({
      pendingTasks: tasksRes.data ?? [],
      behaviors: behaviorsRes.data ?? [],
      health,
      todayPlan: planRes.data as StudyPlan | null,
    }) + subjectContext;

    // Build conversation with Gemini
    const { getGeminiClient } = await import('@/lib/gemini/client');
    const model = getGeminiClient().getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: systemPrompt,
    });

    let validHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.content }],
    }));

    const firstUserIdx = validHistory.findIndex(h => h.role === 'user');
    if (firstUserIdx > 0) {
      validHistory = validHistory.slice(firstUserIdx);
    } else if (firstUserIdx === -1) {
      validHistory = [];
    }

    const chat = model.startChat({ history: validHistory });
    const stream = await chat.sendMessageStream(message);

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(encoder.encode(chunkText));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (err: any) {
    console.error('Tutor API error:', err);
    return NextResponse.json({ error: err.message ?? 'Tutor failed' }, { status: 500 });
  }
}
