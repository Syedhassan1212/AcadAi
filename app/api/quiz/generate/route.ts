import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AIService } from '@/lib/services/ai.service';

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const {
      subtopic_ids = [],
      difficulty = 'mixed',
      count = 5,
      question_type = 'mixed',
    } = await request.json();

    if (!subtopic_ids.length) {
      return NextResponse.json({ error: 'At least one subtopic_id is required' }, { status: 400 });
    }

    // Fetch all selected subtopics with their hierarchy
    const { data: subtopics } = await supabase
      .from('subtopics')
      .select('id, title, difficulty, topics(title, subjects(title))')
      .in('id', subtopic_ids);

    if (!subtopics || subtopics.length === 0) {
      return NextResponse.json({ error: 'No subtopics found' }, { status: 404 });
    }

    const topicNames = subtopics.map((s: any) => s.title);
    const subjectName = (subtopics[0] as any).topics?.subjects?.title || 'General';

    const context = `Subject: ${subjectName}, Topics: ${topicNames.join(', ')}`;
    const quizzes = await AIService.generateQuiz(topicNames, context, {
      difficulty,
      count: Math.min(count, 20),
      questionType: question_type,
    });

    // Store in DB
    if (quizzes.length > 0) {
      const inserts = quizzes.map((q: any) => ({
        user_id: user.id,
        subtopic_id: subtopic_ids[0], // primary subtopic
        topic: q.topic || topicNames[0],
        question: q.question,
        question_type: q.type || 'mcq',
        options: q.type === 'mcq' ? (q.options ?? []) : null,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty || difficulty,
      }));
      await supabase.from('quizzes').insert(inserts);
    }

    return NextResponse.json({
      success: true,
      questions: quizzes,
      count: quizzes.length,
    });
  } catch (err: any) {
    console.error('Quiz generation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
