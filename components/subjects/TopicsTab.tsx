'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface TopicsTabProps {
  subjectId: string;
  initialTopics: any[];
  selectedSubtopics: string[];
  onSelectionChange: (ids: string[]) => void;
  onAction: (action: 'notes' | 'quiz' | 'ai', subtopicIds: string[]) => void;
  topologicalOrder?: string[];
}

export default function TopicsTab({
  subjectId,
  initialTopics,
  selectedSubtopics,
  onSelectionChange,
  onAction,
  topologicalOrder = [],
}: TopicsTabProps) {
  const router = useRouter();
  // Sort initial data based on topological order if available
  const sortSubtopics = (subs: any[]) => {
    if (!topologicalOrder.length) return subs;
    return [...subs].sort((a, b) => {
      const idxA = topologicalOrder.indexOf(a.id);
      const idxB = topologicalOrder.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  };

  const [topics, setTopics] = useState(
    initialTopics.map(t => ({
      ...t,
      subtopics: sortSubtopics(t.subtopics || [])
    }))
  );
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [subtopicDrafts, setSubtopicDrafts] = useState<Record<string, string>>({});
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(
    new Set(initialTopics.map((t: any) => t.id))
  );
  const [topicUploading, setTopicUploading] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeUploadTopicId, setActiveUploadTopicId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubtopic = (id: string) => {
    const isSelected = selectedSubtopics.includes(id);
    onSelectionChange(
      isSelected
        ? selectedSubtopics.filter((s) => s !== id)
        : [...selectedSubtopics, id]
    );
  };

  const toggleAllInTopic = (topic: any) => {
    const subtopicIds = (topic.subtopics || []).map((s: any) => s.id);
    const allSelected = subtopicIds.every((id: string) => selectedSubtopics.includes(id));
    if (allSelected) {
      onSelectionChange(selectedSubtopics.filter((id) => !subtopicIds.includes(id)));
    } else {
      const newSelection = [...new Set([...selectedSubtopics, ...subtopicIds])];
      onSelectionChange(newSelection);
    }
  };

  const selectAll = () => {
    const allIds = topics.flatMap((t: any) => (t.subtopics || []).map((s: any) => s.id));
    onSelectionChange(allIds);
  };

  const clearSelection = () => onSelectionChange([]);

  const createTopic = async () => {
    if (!newTopicTitle.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('topics')
      .insert({ subject_id: subjectId, title: newTopicTitle.trim() })
      .select('id, title, created_at, subtopics(id, title, difficulty)')
      .single();
    if (data && !error) {
      setTopics([data, ...topics]);
      setNewTopicTitle('');
      setExpandedTopics((prev) => new Set([...prev, data.id]));
    }
  };

  const triggerTopicUpload = (topicId: string) => {
    setActiveUploadTopicId(topicId);
    fileInputRef.current?.click();
  };

  const handleTopicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadTopicId) return;

    setTopicUploading(activeUploadTopicId);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/topics/${activeUploadTopicId}/process`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        // Refresh page or update state to show new subtopics
        window.location.reload();
      }
    } catch (err) {
      console.error('Topic upload failed:', err);
    } finally {
      setTopicUploading(null);
      setActiveUploadTopicId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const createSubtopic = async (topicId: string) => {
    const title = subtopicDrafts[topicId]?.trim();
    if (!title) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('subtopics')
      .insert({ topic_id: topicId, title, difficulty: 0.5 })
      .select('id, title, difficulty')
      .single();
    if (data && !error) {
      setTopics((prev) =>
        prev.map((topic) =>
          topic.id === topicId
            ? { ...topic, subtopics: [data, ...(topic.subtopics || [])] }
            : topic
        )
      );
      setSubtopicDrafts((prev) => ({ ...prev, [topicId]: '' }));
    }
  };

  const deleteTopic = async (topicId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the topic "${title}"? This will remove all its subtopics.`)) return;
    
    const supabase = createClient();
    const { error } = await supabase.from('topics').delete().eq('id', topicId);
    if (!error) {
      setTopics(prev => prev.filter(t => t.id !== topicId));
      setExpandedTopics(prev => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
    } else {
      alert('Failed to delete topic: ' + error.message);
    }
  };

  const deleteSubtopic = async (topicId: string, subtopicId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the subtopic "${title}"?`)) return;
    
    const supabase = createClient();
    const { error } = await supabase.from('subtopics').delete().eq('id', subtopicId);
    if (!error) {
      setTopics(prev => prev.map(topic => 
        topic.id === topicId 
          ? { ...topic, subtopics: topic.subtopics.filter((s: any) => s.id !== subtopicId) }
          : topic
      ));
      onSelectionChange(selectedSubtopics.filter(id => id !== subtopicId));
    } else {
      alert('Failed to delete subtopic: ' + error.message);
    }
  };

  const getDifficultyColor = (d: number) => {
    if (d < 0.4) return 'text-emerald-400 bg-emerald-400/10';
    if (d < 0.7) return 'text-yellow-400 bg-yellow-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  const getDifficultyLabel = (d: number) => {
    if (d < 0.4) return 'Easy';
    if (d < 0.7) return 'Medium';
    return 'Hard';
  };

  const totalSubtopics = topics.reduce((s: number, t: any) => s + (t.subtopics?.length || 0), 0);

  return (
    <div className="space-y-4">
      {/* Bulk Action Bar */}
      {selectedSubtopics.length > 0 && (
        <div className="sticky top-0 z-10 bg-primary/10 backdrop-blur-md border border-primary/20 rounded-xl p-4 flex items-center justify-between animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center text-sm font-bold">
              {selectedSubtopics.length}
            </span>
            <span className="text-sm font-medium text-on-surface">
              topic{selectedSubtopics.length !== 1 ? 's' : ''} selected
            </span>
            <button onClick={clearSelection} className="text-xs text-on-surface-variant hover:text-on-surface ml-2">
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAction('notes', selectedSubtopics)}
              className="px-4 py-2 rounded-lg bg-surface-container text-primary text-sm font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-2 border border-outline-variant/20"
            >
              <span className="material-symbols-outlined text-[18px]">description</span>
              Generate Notes
            </button>
            <button
              onClick={() => onAction('quiz', selectedSubtopics)}
              className="px-4 py-2 rounded-lg bg-surface-container text-primary text-sm font-semibold hover:bg-surface-container-high transition-colors flex items-center gap-2 border border-outline-variant/20"
            >
              <span className="material-symbols-outlined text-[18px]">quiz</span>
              Start Quiz
            </button>
            <button
              onClick={() => onAction('ai', selectedSubtopics)}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary-fixed transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">psychology</span>
              Ask AI
            </button>
          </div>
        </div>
      )}

      {/* Header + Add Topic */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex gap-2">
          <input
            value={newTopicTitle}
            onChange={(e) => setNewTopicTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createTopic()}
            placeholder="Add a new topic..."
            className="flex-1 bg-surface-container border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm text-on-surface outline-none focus:border-primary/50 transition-colors"
          />
          <button
            onClick={createTopic}
            className="px-5 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add
          </button>
        </div>
        {totalSubtopics > 0 && (
          <button
            onClick={selectedSubtopics.length === totalSubtopics ? clearSelection : selectAll}
            className="px-3 py-2 text-xs text-on-surface-variant hover:text-primary transition-colors"
          >
            {selectedSubtopics.length === totalSubtopics ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleTopicUpload}
        className="hidden"
        accept=".txt,.pdf,.doc,.docx"
      />

      {/* Topics Tree */}
      <div className="space-y-3">
        {topics.map((topic) => {
          const isExpanded = expandedTopics.has(topic.id);
          const isUploading = topicUploading === topic.id;
          const subtopics = topic.subtopics || [];
          const topicSubIds = subtopics.map((s: any) => s.id);
          const allTopicSelected = topicSubIds.length > 0 && topicSubIds.every((id: string) => selectedSubtopics.includes(id));
          const someTopicSelected = topicSubIds.some((id: string) => selectedSubtopics.includes(id));

          return (
            <div key={topic.id} className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden transition-all">
              {/* Topic Header */}
              <div className={`flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-surface-container-high transition-colors ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
                onClick={() => toggleExpand(topic.id)}
              >
                {subtopics.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleAllInTopic(topic); }}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      allTopicSelected
                        ? 'bg-primary border-primary text-on-primary'
                        : someTopicSelected
                        ? 'border-primary/50 bg-primary/20'
                        : 'border-outline-variant/40 hover:border-primary/40'
                    }`}
                  >
                    {(allTopicSelected || someTopicSelected) && (
                      <span className="material-symbols-outlined text-[14px]">
                        {allTopicSelected ? 'check' : 'remove'}
                      </span>
                    )}
                  </button>
                )}
                <span className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                  chevron_right
                </span>
                <span className="material-symbols-outlined text-primary text-[20px]">
                  {isUploading ? 'sync' : 'folder_open'}
                </span>
                <h3 className="font-semibold text-on-surface flex-1">
                  {topic.title}
                  {isUploading && <span className="ml-3 text-xs font-normal text-primary animate-pulse">Extracting concepts...</span>}
                </h3>
                
                {/* Topic Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); triggerTopicUpload(topic.id); }}
                    className="group/upload px-4 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-all border border-primary/30 hover:border-primary/60 flex items-center gap-2 text-primary hover:shadow-[0_0_25px_-5px_rgba(208,188,255,0.4)] backdrop-blur-sm"
                    title="Upload material to this topic"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isUploading ? 'animate-spin' : 'group-hover:-translate-y-0.5 transition-all duration-300'}`}>
                      {isUploading ? 'sync' : 'cloud_upload'}
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-widest leading-none">
                      {isUploading ? 'Processing...' : 'Upload'}
                    </span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id, topic.title); }}
                    className="w-8 h-8 rounded-full bg-on-surface-variant/5 hover:bg-error/10 text-on-surface-variant/40 hover:text-error transition-all flex items-center justify-center border border-transparent hover:border-error/20"
                    title="Delete Topic"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>

                <span className="text-xs text-on-surface-variant bg-surface-container-highest px-2.5 py-1 rounded-full">
                  {subtopics.length} subtopic{subtopics.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Subtopics */}
              {isExpanded && (
                <div className="border-t border-outline-variant/10 bg-surface-container-low">
                  {subtopics.map((sub: any) => {
                    const isSelected = selectedSubtopics.includes(sub.id);
                    return (
                      <div
                        key={sub.id}
                        onClick={() => router.push(`/subjects/${subjectId}/subtopics/${sub.id}`)}
                        className={`flex items-center gap-3 px-5 py-3 pl-14 cursor-pointer transition-all border-b border-outline-variant/5 last:border-0 ${
                          isSelected ? 'bg-primary/5' : 'hover:bg-surface-container'
                        }`}
                      >
                        <div 
                          onClick={(e) => { e.stopPropagation(); toggleSubtopic(sub.id); }}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-primary border-primary text-on-primary'
                            : 'border-outline-variant/40 hover:border-primary/40'
                        }`}>
                          {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                        </div>
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">article</span>
                        <span className="flex-1 text-sm text-on-surface font-medium hover:text-primary transition-colors">{sub.title}</span>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getDifficultyColor(Number(sub.difficulty || 0.5))}`}>
                            {getDifficultyLabel(Number(sub.difficulty || 0.5))}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSubtopic(topic.id, sub.id, sub.title); }}
                            className="w-6 h-6 rounded-lg hover:bg-error/10 text-on-surface-variant/30 hover:text-error transition-all flex items-center justify-center group/del"
                            title="Delete Subtopic"
                          >
                            <span className="material-symbols-outlined text-[16px] group-hover/del:scale-110 transition-transform">delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add subtopic inline */}
                  <div className="flex gap-2 px-5 py-3 pl-14">
                    <input
                      value={subtopicDrafts[topic.id] || ''}
                      onChange={(e) => setSubtopicDrafts((p) => ({ ...p, [topic.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && createSubtopic(topic.id)}
                      placeholder="Add subtopic..."
                      className="flex-1 bg-surface border border-outline-variant/20 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary/50"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); createSubtopic(topic.id); }}
                      className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {topics.length === 0 && (
        <div className="text-center py-16 text-on-surface-variant text-sm border border-dashed border-outline-variant/20 rounded-xl bg-surface-container/50">
          <span className="material-symbols-outlined text-4xl mb-3 block text-on-surface-variant/50">account_tree</span>
          No topics yet. Upload a document to auto-extract topics, or add them manually above.
        </div>
      )}
    </div>
  );
}
