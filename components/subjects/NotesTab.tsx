'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import NoteEditor from './NoteEditor';
import { ExportService } from '@/lib/services/export.service';

interface NotesTabProps {
  subjectId: string;
  initialNotes: any[];
  topics: any[];
  pendingGeneration?: string[] | null;
}

export default function NotesTab({ subjectId, initialNotes, topics, pendingGeneration }: NotesTabProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filterTopic, setFilterTopic] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const supabase = createClient();

  // Auto-trigger generation if parent passes subtopic IDs
  useEffect(() => {
    if (pendingGeneration && pendingGeneration.length > 0) {
      handleAIGenerate(pendingGeneration);
    }
  }, [pendingGeneration]);

  const handleAIGenerate = async (subtopicIds: string[]) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/notes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtopic_ids: subtopicIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate notes');
      if (data.note) {
        setNotes([data.note, ...notes]);
        selectNote(data.note);
      }
    } catch (err: any) {
      console.error('Failed to generate notes:', err);
      setError(err.message || 'Unable to reach AI intelligence. Please try again soon.');
    } finally {
      setGenerating(false);
    }
  };

  const createBlankNote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: 'Untitled Note',
        content: '',
        tags: [],
      })
      .select()
      .single();

    if (data && !error) {
      setNotes([data, ...notes]);
      selectNote(data);
    }
  };

  const selectNote = (note: any) => {
    setSelectedNote(note);
    setDraftTitle(note.title || '');
    setDraftContent(note.content || '');
  };

  const uploadAndInsertImageOnly = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/notes/upload-image', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      return data.url || null;
    } catch (err) {
      console.error('Upload failed:', err);
      return null;
    }
  };

  const saveNote = async () => {
    if (!selectedNote) return;
    setSaving(true);
    const res = await fetch(`/api/notes/${selectedNote.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: draftTitle, content: draftContent }),
    });
    if (res.ok) {
      const payload = await res.json();
      const updated = payload.note;
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setSelectedNote(updated);
    }
    setSaving(false);
  };

  const exportNote = async () => {
    if (!selectedNote) return;
    setExporting(true);
    const filename = (draftTitle || 'note').replace(/[^a-z0-9-_]/gi, '_');
    await ExportService.exportToPDF('notion-editor-canvas', filename);
    setExporting(false);
  };

  const deleteNote = async (noteId: string) => {
    await supabase.from('notes').delete().eq('id', noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setDraftTitle('');
      setDraftContent('');
    }
  };

  const filteredNotes = filterTopic === 'all'
    ? notes
    : notes.filter((n) => n.tags?.includes(filterTopic));

  return (
    <div className="flex gap-6 h-[calc(100vh-16rem)]">
      {/* Left: Notes List */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        {/* Actions */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={createBlankNote}
            className="flex-1 px-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Note
          </button>
          <button
            onClick={() => {
              // On this specific page, we usually have 1 subtopic in 'topics' prop
              const subtopicIds = topics.flatMap(t => (t.subtopics || []).map((s: any) => s.id));
              if (subtopicIds.length > 0) handleAIGenerate([subtopicIds[0]]);
            }}
            disabled={generating}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary-fixed transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">{generating ? 'sync' : 'auto_awesome'}</span>
            {generating ? 'AI Thinking...' : 'AI Intelligence'}
          </button>
        </div>

        {/* Filter - only show dropdown when there are multiple topics */}
        {topics.length > 1 ? (
          <select
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            className="mb-4 bg-surface-container border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary/50"
          >
            <option value="all">All Notes</option>
            {topics.map((t: any) => (
              <optgroup key={t.id} label={t.title}>
                {(t.subtopics || []).map((s: any) => (
                  <option key={s.id} value={s.title}>{s.title}</option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : topics.length === 1 ? (
          <div className="mb-3 flex items-center gap-2 px-1">
            <span className="material-symbols-outlined text-primary text-[14px]">folder</span>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{topics[0]?.title}</span>
          </div>
        ) : null}

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
          {generating && (
            <div className="bg-primary/10 rounded-xl p-4 border border-primary/20 flex items-center gap-3 animate-pulse">
              <span className="material-symbols-outlined text-primary animate-spin text-[18px]">sync</span>
              <span className="text-sm text-primary font-medium">Generating AI notes...</span>
            </div>
          )}
          {error && (
            <div className="bg-red-400/10 rounded-xl p-4 border border-red-400/20 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-red-400">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span className="text-sm font-bold">AI Limit Reached</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                {error.includes('429') || error.includes('Quota') 
                  ? 'You\'ve reached the daily magic limit for the Free Tier. Please wait a few hours or upgrade your plan.'
                  : error}
              </p>
              <button onClick={() => setError(null)} className="text-[10px] text-red-400 font-bold uppercase tracking-widest text-left hover:underline">Dismiss</button>
            </div>
          )}
          {filteredNotes.map((note) => {
            const isActive = selectedNote?.id === note.id;
            return (
              <div
                key={note.id}
                onClick={() => selectNote(note)}
                className={`relative rounded-xl p-3 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-surface-container-high border border-primary/20'
                    : 'bg-surface-container border border-outline-variant/10 hover:bg-surface-container-high'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-10 bg-primary rounded-r-full" />
                )}
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-sm font-semibold text-on-surface line-clamp-1">{note.title || 'Untitled'}</h4>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="text-on-surface-variant/50 hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
                <p className="text-xs text-on-surface-variant line-clamp-2 mb-2">
                  {(note.content || '').replace(/<[^>]*>/g, '').replace(/[#*_|`>-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)}
                </p>
                <div className="flex items-center gap-2">
                  {note.tags?.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                  <span className="text-[10px] text-on-surface-variant ml-auto" suppressHydrationWarning>
                    {new Date(note.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
          {filteredNotes.length === 0 && !generating && (
            <div className="text-center py-16 text-on-surface-variant text-xs">
              No notes yet. Create one or generate with AI from the Topics tab.
            </div>
          )}
        </div>
      </div>

      {/* Right: Note Editor */}
      <div className={`flex flex-col rounded-xl border border-outline-variant/10 overflow-hidden transition-all duration-300 ${
        isFullScreen 
          ? 'fixed inset-4 z-[60] bg-surface-container-low shadow-2xl' 
          : 'flex-1 bg-surface-container-low'
      }`}>
        {selectedNote ? (
          <>
            {/* Editor Header */}
            <div className="px-5 py-3 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">description</span>
                <span className="text-xs font-medium text-on-surface-variant">Editor</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={saveNote} className="px-4 py-1.5 text-xs rounded-lg bg-primary text-on-primary font-semibold hover:bg-primary-fixed transition-colors">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button 
                  onClick={exportNote} 
                  disabled={exporting}
                  className="px-4 py-1.5 text-xs rounded-lg border border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {exporting ? (
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                  )}
                  {exporting ? 'Exporting...' : 'Export PDF'}
                </button>

                <div className="w-px h-4 bg-outline-variant/20 mx-1" />

                <button 
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-1.5 rounded-lg border border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors flex items-center gap-2"
                  title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isFullScreen ? 'fullscreen_exit' : 'fullscreen'}
                  </span>
                </button>
              </div>
            </div>

            {/* Editor Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              <div className="max-w-3xl mx-auto">
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full text-xl font-black font-headline tracking-tighter text-on-surface mb-6 bg-transparent outline-none border-none focus:ring-0 placeholder:text-on-surface-variant/20"
                  placeholder="Untitled note"
                />
                
                <NoteEditor 
                  content={draftContent}
                  onChange={setDraftContent}
                  onImageUpload={uploadAndInsertImageOnly}
                  placeholder="Start building your intelligence report. Type '/' for commands..."
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4 block">edit_note</span>
              <p className="text-sm text-on-surface-variant">Select a note to edit, or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
