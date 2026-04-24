'use client';

import { useState, useRef } from 'react';

interface DocumentsTabProps {
  subjectId: string;
  initialFiles: any[];
}

export default function DocumentsTab({ subjectId, initialFiles }: DocumentsTabProps) {
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject_id', subjectId);

    try {
      const res = await fetch('/api/ai/process-material', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setSuccessMsg(`Processed "${file.name}" — ${data.topicsCreated} topics, ${data.subtopicsCreated} subtopics extracted`);
      // Refresh the page to show new topics
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleUpload(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) handleUpload(f);
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer group transition-all duration-300 ${
          dragActive
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : uploading
            ? 'border-primary/50 bg-surface-container'
            : 'border-outline-variant/30 bg-surface-container hover:bg-surface-container-high hover:border-primary/30'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".txt,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />
        <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border transition-all duration-300 ${
            uploading
              ? 'bg-primary/10 border-primary/30 animate-pulse'
              : 'bg-surface-container-highest border-outline-variant/20 group-hover:border-primary/40 group-hover:shadow-[0_0_30px_rgba(208,188,255,0.1)]'
          }`}>
            <span className="material-symbols-outlined text-primary text-3xl">
              {uploading ? 'sync' : 'cloud_upload'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-on-surface mb-2 font-headline">
            {uploading ? 'Processing Document...' : 'Drop your study material here'}
          </h3>
          <p className="text-sm text-on-surface-variant font-body mb-5 max-w-md">
            {uploading
              ? 'AI is extracting topics and building your knowledge graph. This may take a minute.'
              : 'Upload PDFs, DOCX, or TXT files. AI will automatically extract topics and subtopics.'}
          </p>
          <div className="flex gap-2">
            {['PDF', 'DOCX', 'TXT'].map((ext) => (
              <span key={ext} className="px-3 py-1 bg-surface-container-low rounded-lg text-xs font-semibold text-on-surface-variant uppercase tracking-wider font-label border border-outline-variant/10">
                {ext}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="bg-error-container text-on-error-container text-sm p-4 rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-primary/10 text-primary text-sm p-4 rounded-xl flex items-center gap-2 border border-primary/20">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {successMsg}
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-4">
            Uploaded Documents ({files.length})
          </h3>
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="bg-surface-container rounded-xl p-4 border border-outline-variant/10 flex items-center justify-between group hover:bg-surface-container-high transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center border border-outline-variant/20">
                    <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                      {file.file_name?.endsWith('.pdf') ? 'picture_as_pdf' : 'description'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-on-surface">{file.file_name}</p>
                    <div className={`text-xs mt-0.5 flex items-center gap-1 font-medium ${
                      file.processing_status === 'failed' ? 'text-error' :
                      file.processing_status === 'done' ? 'text-primary' : 'text-on-surface-variant'
                    }`}>
                      {file.processing_status === 'done' && <span className="material-symbols-outlined text-[14px]">check_circle</span>}
                      {file.processing_status === 'processing' && <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>}
                      {file.processing_status === 'failed' && <span className="material-symbols-outlined text-[14px]">error</span>}
                      {file.processing_status === 'done' ? 'Processed' : file.processing_status === 'processing' ? 'Processing...' : file.processing_status === 'failed' ? 'Failed' : 'Pending'}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-on-surface-variant" suppressHydrationWarning>
                  {new Date(file.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {files.length === 0 && !uploading && (
        <div className="text-center py-12 text-on-surface-variant text-sm border border-dashed border-outline-variant/20 rounded-xl bg-surface-container/50">
          <span className="material-symbols-outlined text-4xl mb-3 block text-on-surface-variant/50">folder_open</span>
          No documents uploaded yet. Upload your first study material above!
        </div>
      )}
    </div>
  );
}
