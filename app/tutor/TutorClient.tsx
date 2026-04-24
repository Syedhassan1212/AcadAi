'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import Sidebar from '@/components/Sidebar';
import { useTutor } from '@/lib/hooks/useTutor';

interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function TutorClient() {
  const [message, setMessage] = useState('');
  const { history, setHistory, isLoading, sendMessage } = useTutor();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isLoading]);

  const handleSend = async () => {
    const userMsg = message.trim();
    if (!userMsg) return;
    setMessage('');
    await sendMessage(userMsg);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-background text-on-background antialiased flex h-screen overflow-hidden">
      <Sidebar active="subjects" />

      {/* TopNavBar */}
      <header className="bg-[#131315]/85 backdrop-blur-[20px] fixed top-0 right-0 app-shell-header h-16 z-40 border-b border-[#494454]/20 hidden md:flex justify-between items-center px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
            <span className="text-xl font-black text-primary">AcadAi</span>
          </Link>
          <nav className="flex gap-6 border-l border-outline-variant/30 pl-6">
            <a href="#" className="text-gray-400 hover:text-primary text-sm font-medium transition-colors">Focus Mode</a>
            <a href="#" className="text-gray-400 hover:text-primary text-sm font-medium transition-colors">Library</a>
            <a href="#" className="text-gray-400 hover:text-primary text-sm font-medium transition-colors">Resources</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-xl">search</span>
          </button>
          <button className="text-on-surface-variant hover:text-primary transition-colors relative">
            <span className="material-symbols-outlined text-xl">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full" />
          </button>
          <button className="ml-2 py-2 px-4 rounded-DEFAULT bg-surface-container-high text-primary font-medium text-sm hover:bg-surface-container-highest transition-colors border border-outline-variant/20">
            Start Timer
          </button>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="flex-1 app-shell-offset mt-16 h-[calc(100vh-4rem)] flex flex-col bg-surface overflow-hidden relative">
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 w-full max-w-4xl mx-auto flex flex-col space-y-8 scrollbar-hide">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-on-surface tracking-tight mb-2">Knowledge Synthesis</h2>
            <p className="text-sm text-on-surface-variant max-w-xl mx-auto">Ask complex questions, upload lecture notes, or request summaries. The focus is on precision and clarity.</p>
          </div>

          {history.length === 0 ? (
            <>
              {/* AI greeting */}
              <div className="flex gap-4 max-w-3xl w-full">
                <div className="w-8 h-8 rounded-DEFAULT bg-surface-container flex-shrink-0 flex items-center justify-center border border-outline-variant/20 mt-1">
                  <span className="material-symbols-outlined text-sm text-primary">psychology</span>
                </div>
                <div className="flex-1 bg-surface-container-low rounded-lg p-5 border border-outline-variant/10 text-sm text-on-surface leading-relaxed shadow-sm">
                  <p>I'm ready to assist with your study flow. We can review your recent uploads, or tackle a new concept. What's the focus today?</p>
                </div>
              </div>

              {/* Suggestion cards */}
              <div className="max-w-3xl w-full mx-auto grid grid-cols-2 gap-4 mt-8">
                {[
                  { icon: 'functions', title: 'Explain this formula', sub: 'Break down variables and derivation.' },
                  { icon: 'menu_book', title: 'Summarize this chapter', sub: 'Extract key concepts and theorems.' },
                  { icon: 'quiz', title: 'Generate a quiz', sub: 'Test knowledge on current topic.' },
                  { icon: 'compare_arrows', title: 'Compare concepts', sub: 'Contrast with Classical Mechanics.' },
                ].map((s) => (
                  <button key={s.title} onClick={() => setMessage(s.title)} className="text-left bg-surface-container-low hover:bg-surface-container-high transition-colors p-4 rounded-lg border border-outline-variant/10 flex flex-col gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">{s.icon}</span>
                    <span className="text-sm font-medium text-on-surface">{s.title}</span>
                    <span className="text-xs text-on-surface-variant">{s.sub}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            history.map((msg, i) => (
              <div key={i} className={`flex gap-4 max-w-4xl w-full ${msg.role === 'user' ? 'self-end flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-1 outline outline-1 outline-offset-2 ${msg.role === 'user' ? 'bg-primary text-on-primary outline-primary/20' : 'bg-surface-container border border-outline-variant/20 outline-on-surface/5'}`}>
                  <span className={`material-symbols-outlined text-sm ${msg.role === 'user' ? 'text-on-primary' : 'text-primary'}`}>{msg.role === 'user' ? 'person' : 'psychology'}</span>
                </div>
                <div className={`flex-1 rounded-[1.25rem] px-6 py-4 text-sm leading-relaxed relative ${msg.role === 'user' 
                  ? 'bg-primary text-on-primary font-bold max-w-[85%] rounded-tr-none' 
                  : 'bg-surface-container-low text-on-surface border border-outline-variant/10 shadow-sm max-w-[90%] rounded-tl-none'}`}>
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
            ))
          )}

          {isLoading && (
            <div className="flex gap-4 max-w-3xl w-full">
              <div className="w-8 h-8 rounded-DEFAULT bg-surface-container flex-shrink-0 flex items-center justify-center border border-outline-variant/20 mt-1">
                <span className="material-symbols-outlined text-sm text-primary animate-pulse">psychology</span>
              </div>
              <div className="flex-1 bg-surface-container-low rounded-lg p-5 border border-outline-variant/10 text-sm text-on-surface leading-relaxed shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} className="h-24" />
        </div>

        {/* Input */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface via-surface/95 to-transparent pt-12 pb-6 px-4 md:px-8">
          <div className="max-w-3xl mx-auto relative">
            <div className="bg-surface-container-highest rounded-lg border border-outline-variant/20 shadow-[0_8px_32px_rgba(208,188,255,0.05)] focus-within:border-primary/50 transition-colors flex items-end p-2">
              <button className="p-2 text-on-surface-variant hover:text-primary transition-colors flex-shrink-0 mb-1">
                <span className="material-symbols-outlined">attach_file</span>
              </button>
              <textarea
                className="w-full bg-transparent border-none focus:ring-0 text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none min-h-[44px] max-h-32 py-3 px-2 outline-none"
                placeholder="Message AI Tutor... (Type '/' for commands)"
                rows={1}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
              />
              <button onClick={handleSend} disabled={isLoading || !message.trim()} className="p-2 bg-surface-container text-primary hover:bg-surface-container-high rounded-DEFAULT transition-colors flex-shrink-0 mb-1 border border-outline-variant/20 disabled:opacity-50">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </div>
            <div className="text-center mt-3">
              <span className="text-[10px] text-on-surface-variant/60 font-medium uppercase tracking-wider">AI outputs may be inaccurate. Verify critical study information.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
