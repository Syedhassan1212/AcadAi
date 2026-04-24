import Sidebar from '@/components/Sidebar';
import AppTopNav from '@/components/AppTopNav';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ActivityChart from '@/components/dashboard/ActivityChart';
import MasteryTrend from '@/components/dashboard/MasteryTrend';
import { DAGService } from '@/lib/services/dag.service';

export const metadata = {
  title: 'Dashboard – AcadAi',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch data in parallel
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [subjectsRes, notesRes, quizzesRes, sessionsRes, attemptsRes, recommendations, recentNotesRes] = await Promise.all([
    supabase
      .from('subjects')
      .select('id, title, created_at, topics(id, subtopics(id))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('notes').select('id').eq('user_id', user.id),
    supabase.from('quizzes').select('id').eq('user_id', user.id),
    supabase.from('study_sessions')
      .select('started_at, duration, elapsed_seconds')
      .eq('user_id', user.id)
      .gte('started_at', sevenDaysAgo.toISOString()),
    supabase.from('quiz_attempts')
      .select('created_at, score, total_questions')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true }),
    DAGService.getRecommendedSubtopics(user.id, 3),
    supabase.from('notes')
      .select('id, title, updated_at, subject_id, subjects!inner(title)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(4),
  ]);

  // Aggregate sessions for ActivityChart
  const sessionAggregation = (sessionsRes.data || []).reduce((acc: any, sess: any) => {
    const day = sess.started_at.split('T')[0];
    acc[day] = (acc[day] || 0) + Math.floor((sess.elapsed_seconds || 0) / 60);
    return acc;
  }, {});
  const activityData = Object.entries(sessionAggregation).map(([day, minutes]) => ({ day, minutes: minutes as number }));

  // Aggregate quiz attempts for MasteryTrend (daily averages)
  const quizAggregation = (attemptsRes.data || []).reduce((acc: any, att: any) => {
    const day = att.created_at.split('T')[0];
    if (!acc[day]) acc[day] = { sum: 0, count: 0 };
    acc[day].sum += (att.score / att.total_questions);
    acc[day].count += 1;
    return acc;
  }, {});
  const performanceData = Object.entries(quizAggregation).map(([day, stats]: [string, any]) => ({
    day,
    score: stats.sum / stats.count
  }));
  // health_reports may not exist yet — query safely
  let healthRecommendation = 'Upload your first document and start studying!';
  try {
    const { data: healthData } = await supabase.from('health_reports').select('recommendation')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
    if (healthData?.[0]?.recommendation) healthRecommendation = healthData[0].recommendation;
  } catch { /* table may not exist yet */ }

  const subjects = subjectsRes.data || [];
  const noteCount = notesRes.data?.length || 0;
  const quizCount = quizzesRes.data?.length || 0;
  const totalTopics = subjects.reduce((s: number, sub: any) => s + (sub.topics?.length || 0), 0);
  const totalSubtopics = subjects.reduce((s: number, sub: any) =>
    s + (sub.topics || []).reduce((ss: number, t: any) => ss + (t.subtopics?.length || 0), 0), 0
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="bg-background text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container min-h-screen flex">
      <Sidebar active="dashboard" />

      <div className="app-shell-offset flex flex-col flex-1 min-h-screen">
        <AppTopNav />

        <main className="flex-1 pt-24 px-6 md:px-10 pb-12 overflow-y-auto">
          {/* Header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-on-surface-variant font-label mb-2">{dateStr}</p>
              <h2 className="text-3xl font-bold font-headline text-on-surface tracking-tight">
                {greeting}, {user.email?.split('@')[0]}.
              </h2>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Subjects', value: subjects.length, icon: 'menu_book', color: 'text-primary', bg: 'bg-primary/10' },
              { label: 'Topics', value: totalSubtopics, icon: 'account_tree', color: 'text-blue-400', bg: 'bg-blue-400/10' },
              { label: 'Notes', value: noteCount, icon: 'description', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
              { label: 'Quizzes', value: quizCount, icon: 'quiz', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10 ghost-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <span className={`material-symbols-outlined text-[20px] ${stat.color}`}>{stat.icon}</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-on-surface tabular-nums">{stat.value}</p>
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/10 ghost-border flex flex-col h-[320px] hover:shadow-[0_8px_32px_rgba(208,188,255,0.08)] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1 opacity-80">AI Strategy</h3>
                  <h3 className="text-lg font-bold text-on-surface font-headline leading-none">Growth & Activity</h3>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mt-2 opacity-60">Minutes studied · Last 7 Days</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[18px]">timeline</span>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <ActivityChart data={activityData} />
              </div>
            </div>

            <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/10 ghost-border flex flex-col h-[320px] hover:shadow-[0_8px_32px_rgba(52,211,153,0.08)] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1 opacity-80">AI Strategy</h3>
                  <h3 className="text-lg font-bold text-on-surface font-headline leading-none">Learning Performance</h3>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold mt-2 opacity-60">Avg Quiz Mastery · Last 7 Days</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-400 text-[18px]">trending_up</span>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <MasteryTrend data={performanceData} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Subjects & Recent Notes */}
            <div className="lg:col-span-8 space-y-8">
              {/* Subjects */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-on-surface font-headline">Your Subjects</h3>
                  <Link href="/tasks" className="text-sm text-primary hover:text-primary-fixed font-medium transition-colors">
                    View All
                  </Link>
                </div>

                {subjects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subjects.slice(0, 4).map((subject: any) => {
                      const topicCount = subject.topics?.length || 0;
                      const subCount = (subject.topics || []).reduce((s: number, t: any) => s + (t.subtopics?.length || 0), 0);
                      return (
                        <Link
                          key={subject.id}
                          href={`/subjects/${subject.id}`}
                          className="group bg-surface-container-low rounded-xl p-5 border border-outline-variant/10 hover:border-primary/30 transition-all ghost-border flex flex-col hover:shadow-[0_4px_24px_rgba(208,188,255,0.05)]"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                              <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-on-surface text-sm truncate group-hover:text-primary transition-colors">{subject.title}</h4>
                              <p className="text-xs text-on-surface-variant">{topicCount} topics · {subCount} subtopics</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-outline-variant/10">
                            <span className="text-[10px] text-on-surface-variant">{new Date(subject.created_at).toLocaleDateString()}</span>
                            <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                              Continue <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-surface-container-low rounded-xl p-10 border border-dashed border-outline-variant/20 text-center">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-3 block">school</span>
                    <h4 className="font-semibold text-on-surface mb-2">Get started</h4>
                    <p className="text-sm text-on-surface-variant mb-4">Create your first subject and upload study material</p>
                    <Link href="/tasks" className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary font-semibold rounded-xl text-sm hover:bg-primary-fixed transition-colors">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Create Subject
                    </Link>
                  </div>
                )}
              </div>

              {/* Recent Notes */}
              <div>
                <h3 className="text-lg font-semibold text-on-surface font-headline mb-4">Recent Notes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(recentNotesRes.data || []).map((note: any) => (
                    <Link
                      key={note.id}
                      href={`/subjects/${note.subject_id}?tab=notes`}
                      className="group bg-surface-container-low rounded-xl p-4 border border-outline-variant/10 hover:border-emerald-400/30 transition-all ghost-border flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-lg bg-emerald-400/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-emerald-400 text-[20px]">description</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-on-surface text-sm truncate group-hover:text-emerald-400 transition-colors">
                          {note.title || 'Untitled Note'}
                        </h4>
                        <p className="text-[10px] text-on-surface-variant truncate uppercase tracking-wider font-bold">
                          {note.subjects?.title}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-emerald-400 transition-colors text-[18px]">open_in_new</span>
                    </Link>
                  ))}
                  {(recentNotesRes.data?.length === 0) && (
                    <div className="col-span-2 py-8 text-center bg-surface-container-low rounded-xl border border-dashed border-outline-variant/20">
                      <p className="text-sm text-on-surface-variant">No notes yet. Start studying a subject to create one.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Adaptive Roadmap */}
            <div className="lg:col-span-4">
              <section className="bg-surface-container-high rounded-2xl p-6 ghost-border h-full flex flex-col shadow-xl border border-primary/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[24px]">explore</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold font-headline text-on-surface">Focus Next</h3>
                    <p className="text-[10px] text-primary uppercase font-black tracking-widest text-emerald-400">Weakest Subject</p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 flex-1">
                  {recommendations.length > 0 ? (
                    recommendations.map((rec: any) => (
                      <Link
                        key={rec.id}
                        href={`/subjects/${rec.subjectId}`}
                        className="bg-surface-container rounded-xl p-4 ghost-border border-l-4 border-l-primary hover:bg-surface-container-highest transition-all group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                            Ready to Learn
                          </span>
                          <span className="material-symbols-outlined text-on-surface-variant/30 group-hover:text-primary transition-colors text-[16px]">trending_flat</span>
                        </div>
                        <h4 className="text-sm font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">{rec.title}</h4>
                        <p className="text-[11px] text-on-surface-variant font-medium mb-3">Topic: {rec.topic}</p>

                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                            <div className="h-full bg-primary/30 rounded-full" style={{ width: '100%' }} />
                          </div>
                          <span className="text-[10px] font-bold text-on-surface-variant">0% mastered</span>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="bg-surface-container rounded-xl p-6 text-center border border-dashed border-outline-variant/20">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 mb-2">done_all</span>
                      <p className="text-sm text-on-surface-variant">You're all caught up! Upload new material to continue.</p>
                    </div>
                  )}

                  {/* AI Recommendation Context */}
                  {recommendations.length > 0 && (
                    <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-primary text-[16px]">auto_awesome</span>
                        <span className="text-[10px] font-bold uppercase text-primary tracking-wider">AI Strategy</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        Based on your DAG, you've mastered the prerequisites for {recommendations[0].title}. Completing this now will unlock the next phase of {recommendations[0].subject}.
                      </p>
                    </div>
                  )}
                </div>

                <Link href="/tasks" className="mt-8 flex items-center justify-center gap-2 py-3 rounded-xl border border-outline-variant/20 text-sm font-bold text-on-surface-variant hover:bg-surface-container-highest transition-all group">
                  View Full Curriculum
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">chevron_right</span>
                </Link>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
