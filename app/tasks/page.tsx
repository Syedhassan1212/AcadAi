import Sidebar from '@/components/Sidebar';
import AppTopNav from '@/components/AppTopNav';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SubjectList from '@/components/tasks/SubjectList';

export const metadata = { title: 'Subjects – AcadAi' };

export default async function SubjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch subjects with nested topics and subtopic counts
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*, topics(id, title, subtopics(id))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="antialiased min-h-screen flex bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container">
      <Sidebar active="subjects" />

      <div className="flex-1 flex flex-col app-shell-offset min-h-screen">
        <AppTopNav />

        <main className="flex-1 pt-24 px-4 md:px-12 pb-12 w-full max-w-7xl mx-auto flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-on-surface font-headline">Subjects</h1>
            <p className="text-sm text-on-surface-variant max-w-xl leading-relaxed">
              Create subjects, upload documents, and let AI extract topics for notes, quizzes, and adaptive learning.
            </p>
          </div>

          <SubjectList initialSubjects={subjects || []} />
        </main>
      </div>
    </div>
  );
}
