import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import AppTopNav from '@/components/AppTopNav';
import NotesTab from '@/components/subjects/NotesTab';
import QuizTab from '@/components/subjects/QuizTab';
import EmbeddedTutor from '@/components/subjects/EmbeddedTutor';
import CollapsibleCard from '@/components/subjects/CollapsibleCard';

interface SubtopicPageProps {
  params: Promise<{ id: string; subId: string }>;
}

export default async function SubtopicHubPage({ params }: SubtopicPageProps) {
  const { id: subjectId, subId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch Subtopic with Subject context
  const { data: subtopic, error: subError } = await supabase
    .from('subtopics')
    .select('*, topics!inner(title, subject_id, subjects!inner(title))')
    .eq('id', subId)
    .single();

  if (subError || !subtopic) notFound();

  // Fetch only notes and quizzes for THIS subtopic
  const [notesRes, quizzesRes, progressRes] = await Promise.all([
    supabase.from('notes').select('*').eq('subtopic_id', subId).order('updated_at', { ascending: false }),
    supabase.from('quizzes').select('*').eq('subtopic_id', subId),
    supabase.from('subtopic_progress').select('*').eq('subtopic_id', subId).eq('user_id', user.id).single()
  ]);

  const mastery = progressRes.data?.mastery_score || 0;

  return (
    <div className="bg-background text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container min-h-screen flex">
      <Sidebar active="subjects" />

      <div className="app-shell-offset flex flex-col flex-1 min-h-screen">
        <AppTopNav />

        <main className="flex-1 p-4 md:p-8 pt-20 overflow-y-auto">
          {/* Header */}
          <div className="max-w-[1400px] mx-auto mb-4 w-full">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
              <Link href={`/subjects/${subjectId}`} className="hover:underline">{subtopic.topics?.subjects?.title}</Link>
              <span className="text-on-surface-variant/30">/</span>
              <span className="text-on-surface-variant font-medium">{subtopic.topics?.title}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-on-surface font-headline leading-tight tracking-tight mb-1 py-2">
                  {subtopic.title}
                </h1>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container rounded-full border border-outline-variant/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{Math.round(mastery * 100)}% Mastered</span>
                  </div>
                </div>
              </div>
              <Link
                href={`/subjects/${subjectId}`}
                className="px-4 py-2 rounded-xl border border-outline-variant/20 hover:bg-surface-container transition-all flex items-center gap-2 text-xs font-semibold"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back
              </Link>
            </div>
          </div>

          {/* Luxury Intelligence Grid */}
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-[1fr,380px] gap-6 w-full items-start">
            
            {/* Left: Intelligence Core */}
            <div className="space-y-4 min-w-0">
              <section className="bg-surface-container-low rounded-2xl border border-outline-variant/10 p-5 md:p-6 shadow-sm ghost-border relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-400 text-[28px]">cognition</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface uppercase tracking-tight font-headline">Intelligence Hub</h3>
                    <p className="text-[10px] text-on-surface-variant uppercase font-black tracking-[0.2em] text-emerald-400/80">Concept Synthesis</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-surface-container-highest/10 rounded-2xl border border-outline-variant/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-30" />
                    <h4 className="text-xs font-black text-on-surface/40 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[16px]">auto_awesome</span>
                      Visual Learning Summary
                    </h4>
                    <p className="text-sm leading-relaxed text-on-surface font-medium italic">
                      "{subtopic.summary || 'I\'ve synthesized your material. Focus on the core knowledge blocks below.'}"
                    </p>
                  </div>
                  
                  <div className="px-2">
                    <NotesTab 
                      subjectId={subjectId}
                      initialNotes={notesRes.data || []}
                      topics={[{
                        id: subtopic.topic_id,
                        title: subtopic.topics?.title,
                        subtopics: [subtopic]
                      }]}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Right: Validation & Mastery Controls */}
            <div className="space-y-8 xl:sticky xl:top-[100px]">
              <CollapsibleCard 
                title="Test Knowledge" 
                subtitle="Practice Mode"
                icon="verified"
                iconBg="bg-yellow-400/10"
                iconColor="text-yellow-400"
              >
                <div className="min-h-[300px]">
                  <QuizTab 
                    subjectId={subjectId}
                    topics={[{
                      id: subtopic.topic_id,
                      title: subtopic.topics?.title,
                      subtopics: [subtopic]
                    }]}
                    initialQuizzes={quizzesRes.data || []}
                  />
                </div>
              </CollapsibleCard>

              <CollapsibleCard 
                title="Ask AI" 
                subtitle="AI Learning Assistant"
                icon="psychology"
                iconBg="bg-primary/10"
                iconColor="text-primary"
              >
                <EmbeddedTutor 
                  subjectId={subjectId}
                  subtopicId={subId}
                  subtopicTitle={subtopic.title}
                  inline={true}
                />
              </CollapsibleCard>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
