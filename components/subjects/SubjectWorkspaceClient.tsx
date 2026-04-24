'use client';

import { useState } from 'react';
import DocumentsTab from './DocumentsTab';
import TopicsTab from './TopicsTab';
import NotesTab from './NotesTab';
import QuizTab from './QuizTab';
import SubjectAIChat from './SubjectAIChat';
import KnowledgeGraph from './KnowledgeGraph';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type TabId = 'documents' | 'topics' | 'notes' | 'quiz' | 'insights';

interface SubjectWorkspaceClientProps {
  subject: any;
  topics: any[];
  files: any[];
  notes: any[];
  quizzes: any[];
  topologicalOrder?: string[];
  graphData: {
    nodes: any[];
    edges: any[];
  };
}

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'documents', label: 'Documents', icon: 'upload_file' },
  { id: 'topics', label: 'Topics', icon: 'account_tree' },
  { id: 'notes', label: 'Notes', icon: 'description' },
  { id: 'quiz', label: 'Architecture', icon: 'quiz' },
];

export default function SubjectWorkspaceClient({
  subject,
  topics,
  files,
  notes,
  quizzes,
  topologicalOrder = [],
  graphData,
}: SubjectWorkspaceClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('topics');
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [preselectedQuizTopics, setPreselectedQuizTopics] = useState<string[] | null>(null);
  const [pendingNoteGeneration, setPendingNoteGeneration] = useState<string[] | null>(null);
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const totalSubtopics = topics.reduce((s: number, t: any) => s + (t.subtopics?.length || 0), 0);

  const handleDeleteSubject = async () => {
    if (!confirm(`Are you sure you want to delete "${subject.title || subject.name}"? This will permanently remove all topics, notes, and quizzes for this subject.`)) return;
    
    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from('subjects').delete().eq('id', subject.id);

    if (error) {
      alert('Failed to delete subject: ' + error.message);
      setIsDeleting(false);
    } else {
      router.push('/dashboard');
    }
  };

  // Calculate aggregate mastery
  const avgMastery = graphData.nodes.length > 0
    ? Math.round(graphData.nodes.reduce((acc, n) => acc + (n.mastery || 0), 0) / graphData.nodes.length)
    : 0;

  const handleTopicAction = (action: 'notes' | 'quiz' | 'ai', subtopicIds: string[]) => {
    if (action === 'notes') {
      setPendingNoteGeneration(subtopicIds);
      setActiveTab('notes');
    } else if (action === 'quiz') {
      setPreselectedQuizTopics(subtopicIds);
      setActiveTab('quiz');
    } else if (action === 'ai') {
      setSelectedSubtopics(subtopicIds);
      setIsChatOpen(true);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Subject Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-on-surface font-headline leading-snug tracking-tight mb-1 py-2">
            {subject.title || subject.name}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {topics.length} topics · {totalSubtopics} subtopics · {files.length} documents · {notes.length} notes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end px-4 py-1.5 border-r border-outline-variant/20 mr-3 text-right">
            <span className="text-[10px] uppercase font-black tracking-wider text-on-surface-variant leading-none mb-1">Subject Health</span>
            <span className={`text-lg font-black ${avgMastery > 80 ? 'text-emerald-400' : avgMastery > 50 ? 'text-primary' : 'text-on-surface-variant'} leading-none`}>
              {avgMastery}%
            </span>
          </div>
          <button
            onClick={() => setIsChatOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 shadow-[0_0_20px_rgba(208,188,255,0.1)]"
          >
            <span className="material-symbols-outlined text-[18px]">psychology</span>
            Ask AI
          </button>
          <button
            onClick={handleDeleteSubject}
            disabled={isDeleting}
            className="w-10 h-10 rounded-xl bg-surface-container-high border border-outline-variant/20 text-on-surface-variant hover:text-error hover:border-error/30 transition-all flex items-center justify-center disabled:opacity-50"
            title="Delete Subject"
          >
            <span className={`material-symbols-outlined text-[20px] ${isDeleting ? 'animate-spin' : ''}`}>
              {isDeleting ? 'sync' : 'delete'}
            </span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Documents', value: files.length, icon: 'upload_file', color: 'text-blue-400' },
          { label: 'Topics', value: totalSubtopics, icon: 'account_tree', color: 'text-primary' },
          { label: 'Notes', value: notes.length, icon: 'description', color: 'text-emerald-400' },
          { label: 'Architecture', value: quizzes.length, icon: 'quiz', color: 'text-yellow-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-container rounded-xl border border-outline-variant/10 px-4 py-3 flex items-center gap-3">
            <span className={`material-symbols-outlined text-[20px] ${stat.color}`}>{stat.icon}</span>
            <div>
              <p className="text-xl font-bold text-on-surface tabular-nums">{stat.value}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-surface-container rounded-xl p-1.5 border border-outline-variant/10">
        {[...tabs, { id: 'insights', label: 'Insights', icon: 'insights' }].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id as TabId);
              if (tab.id !== 'notes') setPendingNoteGeneration(null);
              if (tab.id !== 'quiz') setPreselectedQuizTopics(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${activeTab === tab.id
                ? 'bg-primary text-on-primary shadow-[0_2px_12px_rgba(208,188,255,0.2)]'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
              }`}
          >
            <span className="material-symbols-outlined text-[18px]"
              style={activeTab === tab.id ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'documents' && (
          <DocumentsTab subjectId={subject.id} initialFiles={files} />
        )}
        {activeTab === 'topics' && (
          <TopicsTab
            subjectId={subject.id}
            initialTopics={topics}
            selectedSubtopics={selectedSubtopics}
            onSelectionChange={setSelectedSubtopics}
            onAction={handleTopicAction}
            topologicalOrder={topologicalOrder}
          />
        )}
        {activeTab === 'notes' && (
          <NotesTab
            subjectId={subject.id}
            initialNotes={notes}
            topics={topics}
            pendingGeneration={pendingNoteGeneration}
          />
        )}
        {activeTab === 'quiz' && (
          <QuizTab
            subjectId={subject.id}
            topics={topics}
            initialQuizzes={quizzes}
            preselectedSubtopics={preselectedQuizTopics}
            topologicalOrder={topologicalOrder}
          />
        )}
        {(activeTab as string) === 'insights' && (
          <div className="space-y-6">
            <div className="bg-surface-container rounded-2xl border border-outline-variant/10 p-8 min-h-[600px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-on-surface font-headline">Knowledge Synthesis Graph</h3>
                  <p className="text-sm text-on-surface-variant">Visualizing prerequisite dependencies and mastery levels</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Mastered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Learning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-outline-variant/30" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Locked</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-[500px] relative bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden">
                <KnowledgeGraph subjectId={subject.id} data={graphData} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Float AI Chat Button (mobile fallback) */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-primary text-on-primary shadow-[0_4px_24px_rgba(208,188,255,0.3)] flex items-center justify-center hover:scale-105 transition-transform z-50 md:hidden"
        >
          <span className="material-symbols-outlined text-2xl">psychology</span>
        </button>
      )}

      {/* AI Chat Panel */}
      <SubjectAIChat
        subjectId={subject.id}
        subjectTitle={subject.title}
        selectedTopicIds={selectedSubtopics}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}
