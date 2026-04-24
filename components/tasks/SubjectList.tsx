'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function SubjectList({ initialSubjects }: { initialSubjects: any[] }) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('subjects')
      .insert([{ user_id: user.id, title: newTitle, name: newTitle }])
      .select('*, topics(id, subtopics(id))')
      .single();

    if (data && !error) {
      setSubjects([data, ...subjects]);
      setIsCreating(false);
      setNewTitle('');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject and all its data?')) return;
    setDeleting(id);
    const supabase = createClient();
    await supabase.from('subjects').delete().eq('id', id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setDeleting(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Create Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsCreating(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 shadow-[0_0_20px_rgba(208,188,255,0.1)]"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Subject
        </button>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="bg-surface-container border border-primary/20 rounded-xl p-6 shadow-lg shadow-primary/5">
          <h3 className="text-base font-semibold text-on-surface mb-4 font-headline">Create New Subject</h3>
          <div className="flex gap-3">
            <input
              autoFocus
              className="flex-1 bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface outline-none focus:border-primary/50 transition-colors"
              placeholder="e.g. Intro to Computer Science, Organic Chemistry..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button onClick={handleCreate} className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl hover:bg-primary-fixed transition-colors text-sm">
              Create
            </button>
            <button onClick={() => { setIsCreating(false); setNewTitle(''); }} className="px-4 py-3 hover:bg-surface-container-high rounded-xl transition-colors text-sm font-medium text-on-surface-variant">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Subject Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {subjects.map((subject) => {
          const topicCount = subject.topics?.length || 0;
          const subtopicCount = (subject.topics || []).reduce((s: number, t: any) => s + (t.subtopics?.length || 0), 0);

          return (
            <Link
              key={subject.id}
              href={`/subjects/${subject.id}`}
              className="group relative bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden hover:border-primary/30 transition-all duration-300 flex flex-col hover:shadow-[0_4px_32px_rgba(208,188,255,0.07)]"
            >
              {/* Gradient accent bar */}
              <div className="h-1 bg-gradient-to-r from-primary to-primary-container opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      menu_book
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(subject.id); }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {deleting === subject.id ? 'sync' : 'delete'}
                    </span>
                  </button>
                </div>

                <h3 className="text-lg font-bold text-on-surface font-headline mb-1 group-hover:text-primary transition-colors line-clamp-1">
                  {subject.title}
                </h3>

                <div className="flex items-center gap-4 mt-1 mb-4">
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">account_tree</span>
                    {topicCount} topics
                  </span>
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">article</span>
                    {subtopicCount} subtopics
                  </span>
                </div>

                {/* Mini topic pills */}
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {(subject.topics || []).slice(0, 3).map((topic: any) => (
                    <span key={topic.id} className="text-[10px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full truncate max-w-[120px]">
                      {topic.title}
                    </span>
                  ))}
                  {topicCount > 3 && (
                    <span className="text-[10px] font-semibold text-on-surface-variant bg-surface-container-highest px-2.5 py-1 rounded-full">
                      +{topicCount - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-outline-variant/10 bg-surface-container-low flex items-center justify-between group-hover:bg-surface-container transition-colors">
                <span className="text-xs text-on-surface-variant">
                  {new Date(subject.created_at).toLocaleDateString()}
                </span>
                <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                  Open <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {subjects.length === 0 && !isCreating && (
        <div className="col-span-full py-20 text-center border-2 border-dashed border-outline-variant/20 rounded-xl bg-surface-container/30">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4 block">school</span>
          <h3 className="text-lg font-semibold text-on-surface mb-2">No subjects yet</h3>
          <p className="text-sm text-on-surface-variant mb-6">Create your first subject to start organizing your study material</p>
          <button
            onClick={() => setIsCreating(true)}
            className="px-6 py-3 bg-primary text-on-primary font-semibold rounded-xl hover:bg-primary-fixed transition-colors text-sm inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Your First Subject
          </button>
        </div>
      )}
    </div>
  );
}
