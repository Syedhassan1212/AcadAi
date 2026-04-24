'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { PromptInputBox } from '../ui/PromptInputBox';
import { useTutor } from '@/lib/hooks/useTutor';

interface SubjectAIChatProps {
  subjectId: string;
  subjectTitle: string;
  selectedTopicIds?: string[];
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function SubjectAIChat({ subjectId, subjectTitle, selectedTopicIds = [], isOpen, onClose }: SubjectAIChatProps) {
  const { history, setHistory, isLoading, sendMessage } = useTutor({
    subjectId,
    topicIds: selectedTopicIds
  });
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  const handleSend = async (msg: string) => {
    await sendMessage(msg);
  };


  if (!isOpen) return null;

  return (
    <>
      {/* Ultra-Minimal Backdrop */}
      <div className="fixed inset-0 bg-[#000]/60 backdrop-blur-md z-[60] animate-in fade-in duration-500" onClick={onClose} />

      {/* Luxury V3 Panel */}
      <div className="fixed top-4 right-4 bottom-4 w-full max-w-xl z-[70] flex flex-col bg-[#0a0a0b] border border-outline-variant/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden animate-in slide-in-from-right-10 duration-500">

        {/* Intelligence Header */}
        <div className="px-10 py-8 flex items-center justify-between bg-gradient-to-b from-surface-container/20 to-transparent">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative w-12 h-12 rounded-2xl bg-on-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-surface-container text-[24px]">psychology</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-headline font-black italic uppercase tracking-tighter text-on-surface">Neural Tutor</h3>
              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mt-1">Context: {subjectTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low border border-outline-variant/10 hover:bg-on-surface hover:text-surface-container transition-all group active:scale-90"
          >
            <span className="material-symbols-outlined text-[20px] group-hover:rotate-90 transition-transform">close</span>
          </button>
        </div>

        {/* Intelligence Thread */}
        <div className="flex-1 overflow-y-auto px-10 space-y-12 scrollbar-hide py-10">
          {history.length === 0 && (
            <div className="py-20 flex flex-col items-center text-center">
              <div className="space-y-4 mb-12">
                <h4 className="text-3xl font-headline font-black italic uppercase tracking-tighter text-on-surface/80">Establish Query</h4>
                <p className="text-xs font-medium text-on-surface-variant/40 max-w-sm mx-auto">
                  Tutor is synchronized with your specific subject matter and curriculum. How can we optimize your understanding?
                </p>
              </div>

              <div className="w-full max-w-sm space-y-3">
                {[
                  { icon: 'bolt', text: 'Accelerated Summary' },
                  { icon: 'query_stats', text: 'Identify Knowledge Gaps' },
                  { icon: 'model_training', text: 'Simulate Examination' },
                ].map((s) => (
                  <button
                    key={s.text}
                    onClick={() => handleSend(s.text)}
                    className="w-full group flex items-center justify-between px-6 py-5 rounded-[1.5rem] bg-surface-container-low border border-outline-variant/5 hover:border-primary/30 hover:bg-surface-container transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-primary/40 group-hover:text-primary transition-colors text-[20px]">{s.icon}</span>
                      <span className="text-xs font-black uppercase tracking-widest text-on-surface-variant group-hover:text-on-surface transition-colors">{s.text}</span>
                    </div>
                    <span className="material-symbols-outlined text-[18px] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">arrow_forward</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((msg, i) => (
            <div key={i} className={`flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-full animate-in slide-in-from-bottom-4 duration-500`}>
              <div className="flex items-center gap-3 mb-1 px-4">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">
                  {msg.role === 'user' ? 'Inquisitor' : 'Neural Response'}
                </span>
                <div className={`w-1 h-1 rounded-full ${msg.role === 'user' ? 'bg-primary animate-pulse' : 'bg-on-surface/40'}`} />
              </div>
              <div className={`relative px-8 py-6 rounded-[2.5rem] text-sm leading-relaxed transition-all shadow-xl ${msg.role === 'user'
                ? 'bg-primary text-on-primary font-bold max-w-[90%] rounded-tr-none'
                : 'bg-surface-container-low border border-outline-variant/10 text-on-surface/90 font-medium max-w-full rounded-tl-none backdrop-blur-xl'
                }`}>
                {msg.role === 'assistant' ? (
                  <div className="markdown-content prose prose-invert max-w-none text-on-surface/90">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed text-sm lg:text-base">{children}</p>,
                        strong: ({ children }) => <strong className="font-black text-primary italic px-0.5">{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2">{children}</ul>,
                        li: ({ children }) => <li className="text-on-surface-variant/90">{children}</li>,
                        h3: ({ children }) => <h3 className="text-lg font-black uppercase tracking-[0.2em] text-primary mt-8 mb-4 border-b border-primary/10 pb-2">{children}</h3>,
                        code: ({ children }) => <code className="bg-primary/10 text-primary px-2 py-1 rounded-lg text-[13px] font-mono border border-primary/5">{children}</code>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-primary/40 pl-6 italic text-on-surface-variant/70 my-6 bg-primary/5 py-3 rounded-r-2xl">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col gap-3 items-start animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="flex items-center gap-3 mb-1 px-4">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Neural Synthesis</span>
                <div className="w-1 h-1 rounded-full bg-primary animate-ping" />
              </div>
              <div className="bg-surface-container-low rounded-3xl px-8 py-5 border border-outline-variant/10 flex items-center gap-3 shadow-lg">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} className="h-20" />
        </div>

        {/* Luxury Floating Input */}
        <div className="px-6 py-6 bg-gradient-to-t from-surface-container/20 to-transparent">
          <PromptInputBox 
            onSend={(msg, files) => {
              // Note: Files are handled by the component UI, 
              // but we pass the message to our existing handleSend logic.
              handleSend(msg);
            }}
            isLoading={isLoading}
            placeholder="Submit query to neural network..."
          />
          <p className="text-center text-[8px] font-black text-on-surface-variant/20 uppercase tracking-[0.3em] mt-6">Neural Protocol v3.0 // Active Consciousness</p>
        </div>
      </div>
    </>
  );
}
