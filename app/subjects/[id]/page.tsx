import Sidebar from '@/components/Sidebar';
import AppTopNav from '@/components/AppTopNav';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SubjectWorkspaceClient from '@/components/subjects/SubjectWorkspaceClient';
import { DAGService } from '@/lib/services/dag.service';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: subject } = await supabase.from('subjects').select('title, name').eq('id', id).single();
  return { title: `${subject?.title || subject?.name || 'Subject'} – AcadAi` };
}

export default async function SubjectWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch all data in parallel
  const [subjectRes, topicsRes, filesRes, notesRes, quizzesRes, topologicalOrder, graphData] = await Promise.all([
    supabase.from('subjects').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase.from('topics')
      .select('id, title, created_at, subtopics(id, title, difficulty)')
      .eq('subject_id', id)
      .order('created_at', { ascending: true }),
    supabase.from('uploaded_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase.from('quizzes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    DAGService.getTopologicalSort(id),
    DAGService.getGraphData(id),
  ]);

  if (!subjectRes.data) redirect('/tasks');

  return (
    <div className="antialiased min-h-screen flex bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container">
      <Sidebar active="subjects" />

      <div className="flex-1 flex flex-col app-shell-offset min-h-screen">
        <AppTopNav />

        <main className="flex-1 pt-24 px-4 md:px-10 pb-12 w-full max-w-7xl mx-auto">
          <SubjectWorkspaceClient
            subject={subjectRes.data}
            topics={topicsRes.data || []}
            files={filesRes.data || []}
            notes={notesRes.data || []}
            quizzes={quizzesRes.data || []}
            topologicalOrder={topologicalOrder}
            graphData={graphData}
          />
        </main>
      </div>
    </div>
  );
}
