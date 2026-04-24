'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTutor } from '@/lib/hooks/useTutor';

interface EmbeddedTutorProps {
  subjectId: string;
  subtopicId: string;
  subtopicTitle: string;
  inline?: boolean;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function EmbeddedTutor({ subjectId, subtopicId, subtopicTitle, inline = false }: EmbeddedTutorProps) {
  const { history, setHistory, isLoading, sendMessage } = useTutor({
    subjectId,
    topicIds: [subtopicId]
  });

  const [inputValue, setInputValue] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputValue]);
  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || inputValue.trim();
    if (!textToSend || isLoading) return;
    setInputValue('');
    await sendMessage(textToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col ${inline ? 'h-[400px]' : 'h-[500px] bg-surface-container-low rounded-2xl border border-outline-variant/10 ghost-border'} overflow-hidden`}>
      {/* Header - Only show if not inline */}
      {!inline && (
        <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">AI Concept Tutor</h3>
              <p className="text-[10px] text-primary uppercase font-black tracking-widest">Context-Locked</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto ${inline ? 'px-0' : 'px-6'} py-6 space-y-6 scrollbar-hide`}>
        {history.length === 0 && (
          <div className="flex flex-col text-left animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 mb-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-40" />
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                <span className="text-primary font-black uppercase tracking-wider mr-2">Concept Sync:</span> I'm focused on <span className="text-on-surface font-black italic underline decoration-primary/30 underline-offset-4">{subtopicTitle}</span>. Ask me anything.
              </p>
            </div>

            <div className="w-full space-y-1.5">
              <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mb-1.5 block px-1">Suggested Inquiries</span>
              {[
                { icon: 'lightbulb', text: 'Explain this in simple terms' },
                { icon: 'help', text: 'What are the key takeaways?' },
                { icon: 'school', text: 'Show me an example' },
              ].map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSend(s.text)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container-high/40 border border-outline-variant/10 hover:bg-surface-container-high transition-all hover:border-primary/30 text-left group/tutor"
                >
                  <span className="material-symbols-outlined text-primary text-[14px] group-hover:scale-110 transition-transform">{s.icon}</span>
                  <span className="text-[11px] text-on-surface font-semibold tracking-tight">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-4 duration-300`}>
            <div className={`w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mt-1 outline outline-1 outline-offset-2 ${msg.role === 'user' ? 'bg-primary text-on-primary outline-primary/20' : 'bg-surface-container-highest border border-outline-variant/20 outline-on-surface/5'
              }`}>
              <span className="material-symbols-outlined text-[12px]">
                {msg.role === 'user' ? 'person' : 'psychology'}
              </span>
            </div>
            <div className={`max-w-[90%] rounded-[1.25rem] px-5 py-3.5 text-[12px] leading-relaxed shadow-sm transition-all ${msg.role === 'user'
              ? 'bg-primary text-on-primary rounded-tr-none'
              : 'bg-surface-container-highest/60 text-on-surface border border-outline-variant/20 backdrop-blur-md rounded-tl-none font-medium'
              }`}>
              {msg.role === 'assistant' ? (
                <div className="markdown-content prose prose-invert prose-xs max-w-none text-on-surface/90">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
                      strong: ({ children }) => <strong className="font-black text-primary italic px-0.5">{children}</strong>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-3 space-y-1.5">{children}</ul>,
                      li: ({ children }) => <li className="text-on-surface-variant/90">{children}</li>,
                      h3: ({ children }) => <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mt-5 mb-2.5 border-b border-primary/10 pb-1">{children}</h3>,
                      code: ({ children }) => <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-md text-[10px] font-mono border border-primary/5">{children}</code>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-primary/40 pl-4 italic text-on-surface-variant/70 my-4 bg-primary/5 py-2 rounded-r-lg">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 animate-in fade-in duration-300">
            <div className="w-6 h-6 rounded-lg bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center mt-1">
              <span className="material-symbols-outlined text-primary text-[12px] animate-pulse">psychology</span>
            </div>
            <div className="bg-surface-container-highest/40 rounded-2xl px-4 py-2 border border-outline-variant/10 flex items-center gap-1.5 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Compact Inline Input */}
      <div className={`p-3 ${inline ? 'bg-surface-container-low' : 'bg-surface-container'}`}>
        <div className="flex items-end gap-2 rounded-xl bg-surface-container border-none p-2 transition-colors">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this concept..."
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/30 outline-none border-none resize-none min-h-[32px] max-h-[120px] leading-relaxed px-2 py-1 disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isLoading}
            className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center flex-shrink-0 hover:bg-primary/80 disabled:opacity-30 disabled:hover:bg-primary transition-all active:scale-90"
          >
            {isLoading ? (
              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
