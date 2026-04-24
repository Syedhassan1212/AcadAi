'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface QuizTabProps {
  subjectId: string;
  topics: any[];
  initialQuizzes: any[];
  preselectedSubtopics?: string[] | null;
  topologicalOrder?: string[];
}

type QuizState = 'config' | 'active' | 'results';

export default function QuizTab({
  subjectId,
  topics,
  initialQuizzes,
  preselectedSubtopics,
  topologicalOrder = [],
}: QuizTabProps) {
  const [quizState, setQuizState] = useState<QuizState>('config');
  const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>(preselectedSubtopics || []);
  const [difficulty, setDifficulty] = useState('mixed');
  const [questionCount, setQuestionCount] = useState(5);
  const [questionType, setQuestionType] = useState('mixed');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showExplanation, setShowExplanation] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (preselectedSubtopics && preselectedSubtopics.length > 0) {
      setSelectedSubtopics(preselectedSubtopics);
    }
  }, [preselectedSubtopics]);

  const toggleSubtopic = (id: string) => {
    setSelectedSubtopics((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const selectAllInTopic = (topic: any) => {
    const ids = (topic.subtopics || []).map((s: any) => s.id);
    const allSelected = ids.every((id: string) => selectedSubtopics.includes(id));
    if (allSelected) {
      setSelectedSubtopics((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedSubtopics((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const startQuiz = async () => {
    if (selectedSubtopics.length === 0) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtopic_ids: selectedSubtopics,
          difficulty,
          count: questionCount,
          question_type: questionType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate quiz');

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentQ(0);
        setAnswers({});
        setShowExplanation(null);
        setQuizState('active');
      } else {
        throw new Error('No questions generated');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const submitAnswer = (questionIdx: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionIdx]: answer }));
    setShowExplanation(questionIdx);
  };

  const finishQuiz = async () => {
    setQuizState('results');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        subject_id: subjectId,
        score: score,
        total_questions: questions.length,
        subtopic_ids: selectedSubtopics,
        difficulty: difficulty,
      });
    } catch (err) {
      console.error('Failed to save quiz result:', err);
    }
  };

  const resetQuiz = () => {
    setQuizState('config');
    setQuestions([]);
    setAnswers({});
    setCurrentQ(0);
    setShowExplanation(null);
  };

  const score = questions.reduce((acc, q, i) => {
    return acc + (answers[i]?.toLowerCase() === q.correct_answer?.toLowerCase() ? 1 : 0);
  }, 0);

  // ── LUXURY V3 CONFIG VIEW ──
  if (quizState === 'config') {
    return (
      <div className="animate-in fade-in duration-700">
        {/* Compact Header */}
        <div className="mb-5">
          <h2 className="text-lg font-headline font-black italic tracking-tighter uppercase text-on-surface mb-0.5">Start Session</h2>
          <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-widest opacity-40">Practice Mode</p>
        </div>

        <div className="space-y-5">
          {/* Knowledge Scope */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-[0.15em] text-on-surface-variant">Knowledge Domains</span>
              <button 
                onClick={() => setSelectedSubtopics([])}
                className="text-[9px] font-bold text-primary uppercase tracking-widest hover:text-primary-container transition-colors"
                disabled={selectedSubtopics.length === 0}
              >
                Reset
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {topics.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-outline-variant/10 rounded-xl bg-surface-container-low/30">
                  <span className="material-symbols-outlined text-2xl text-on-surface-variant/20 mb-2">inventory_2</span>
                  <p className="text-xs text-on-surface-variant font-medium">No topics detected.</p>
                </div>
              ) : (
                topics.map((topic) => {
                  const subs = topic.subtopics || [];
                  const allSelected = subs.length > 0 && subs.every((s: any) => selectedSubtopics.includes(s.id));
                  return (
                    <div key={topic.id}>
                      <div 
                        onClick={() => selectAllInTopic(topic)}
                        className={`cursor-pointer w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                          allSelected 
                            ? 'bg-primary/5 border-primary/20' 
                            : 'bg-surface-container-low border-outline-variant/5 hover:border-outline-variant/20'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${allSelected ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant/40'}`}>
                          {allSelected && <span className="material-symbols-outlined text-[12px] font-black">check</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-bold transition-colors ${allSelected ? 'text-on-surface' : 'text-on-surface-variant'}`}>{topic.title}</h4>
                          <p className="text-[9px] font-medium text-on-surface-variant/40 uppercase tracking-wider">{subs.length} Units</p>
                        </div>
                      </div>
                      
                      <div className="mt-1.5 ml-8 space-y-1">
                        {sortSubtopics(subs).map((sub: any) => {
                          const isSelected = selectedSubtopics.includes(sub.id);
                          return (
                            <button
                              key={sub.id}
                              onClick={(e) => { e.stopPropagation(); toggleSubtopic(sub.id); }}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all w-full ${
                                isSelected ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${isSelected ? 'bg-primary' : 'bg-outline-variant/40'}`} />
                              <span className="text-[11px] font-semibold truncate leading-none">{sub.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Compact Parameters */}
          <div className="bg-surface-container rounded-xl border border-outline-variant/10 p-4 space-y-4">
            {/* Intensity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-on-surface-variant/60 uppercase tracking-widest">Intensity</span>
                <span className="text-[9px] font-black text-primary px-1.5 py-0.5 bg-primary/10 rounded-full border border-primary/20 uppercase">{difficulty}</span>
              </div>
              <div className="flex bg-surface-container-low rounded-lg p-1 gap-1 border border-outline-variant/10">
                {['easy', 'medium', 'hard', 'mixed'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-1.5 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all ${
                      difficulty === d 
                        ? 'bg-primary text-on-primary shadow-sm' 
                        : 'text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Capacity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-on-surface-variant/60 uppercase tracking-widest">Capacity</span>
                <span className="text-[9px] font-black text-primary px-1.5 py-0.5 bg-primary/10 rounded-full border border-primary/20">{questionCount} Qs</span>
              </div>
              <div className="flex bg-surface-container-low rounded-lg p-1 gap-1 border border-outline-variant/10">
                {[5, 10, 15, 20].map((c) => (
                  <button
                    key={c}
                    onClick={() => setQuestionCount(c)}
                    className={`flex-1 py-1.5 rounded-md text-[9px] font-black transition-all ${
                      questionCount === c 
                        ? 'bg-primary text-on-primary shadow-sm' 
                        : 'text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <span className="text-[9px] font-black text-on-surface-variant/60 uppercase tracking-widest block">Format</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'mcq', label: 'MCQ', icon: 'list' },
                  { value: 'short_answer', label: 'Short', icon: 'edit_square' },
                  { value: 'mixed', label: 'Mix', icon: 'shuffle' },
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setQuestionType(t.value)}
                    className={`px-2 py-2.5 rounded-lg text-[9px] font-black text-center transition-all border flex flex-col items-center gap-1.5 ${
                      questionType === t.value
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface-container-low text-on-surface-variant/50 border-outline-variant/10 hover:border-primary/30 hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{t.icon}</span>
                    <span>{t.label.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-error-container/10 border border-error/20 text-error text-[9px] font-black p-3 rounded-lg flex items-center gap-2 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[14px]">warning</span>
                {error}
              </div>
            )}
          </div>

          {/* Launch Button */}
          <button
            onClick={startQuiz}
            disabled={selectedSubtopics.length === 0 || generating}
            className="w-full h-12 rounded-xl bg-primary text-on-primary font-black text-sm tracking-tighter uppercase relative group overflow-hidden transition-all active:scale-[0.98] disabled:opacity-20 shadow-lg shadow-primary/20"
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="relative z-10 flex items-center justify-center gap-3">
              {generating ? (
                <span className="material-symbols-outlined animate-spin text-xl">sync</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">bolt</span>
                  <span className="text-xs font-black">Launch · {selectedSubtopics.length} Units</span>
                </>
              )}
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ── ACTIVE QUIZ VIEW ──
  if (quizState === 'active') {
    const q = questions[currentQ];
    const answered = answers[currentQ] !== undefined;
    const isCorrect = answers[currentQ]?.toLowerCase() === q?.correct_answer?.toLowerCase();

    return (
      <div className="max-w-4xl mx-auto py-10 animate-in zoom-in-95 duration-500">
        {/* Modern Progress Bar */}
        <div className="mb-12 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50">
            <span>Progress: {currentQ + 1} / {questions.length}</span>
            <span className="text-primary italic">Mode: {q?.type?.toUpperCase()}</span>
          </div>
          <div className="h-1 bg-surface-container-low rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Question Hub */}
          <div className="md:col-span-8 flex flex-col">
            <div className="bg-surface-container rounded-[2rem] border border-outline-variant/10 p-10 flex-1 relative overflow-hidden min-h-[400px]">
              <div className="absolute top-0 left-0 w-1 bg-primary h-full opacity-20" />
              <div className="mb-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary opacity-60 mb-2 block">{q?.topic}</span>
                <h2 className="text-2xl font-bold text-on-surface leading-tight font-headline">
                  {q?.question}
                </h2>
              </div>

              {/* MCQ Options (V3 Minimal) */}
              {q?.type === 'mcq' && q?.options && (
                <div className="space-y-3 mt-10">
                  {q.options.map((opt: string, i: number) => {
                    const isChosen = answers[currentQ] === opt;
                    const isRight = opt.toLowerCase() === q.correct_answer?.toLowerCase() || String.fromCharCode(65 + i).toLowerCase() === q.correct_answer?.toLowerCase();

                    return (
                      <button
                        key={i}
                        onClick={() => !answered && submitAnswer(currentQ, opt)}
                        disabled={answered}
                        className={`w-full group text-left px-8 py-5 rounded-[1.5rem] border transition-all flex items-center gap-6 ${
                          answered
                            ? isRight
                              ? 'bg-emerald-400/10 border-emerald-400/50'
                              : isChosen
                                ? 'bg-error/10 border-error/50'
                                : 'opacity-30 grayscale'
                            : 'bg-surface-container-low border-outline-variant/5 hover:border-primary/50 hover:bg-surface-container-high'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 transition-all ${
                          answered && isRight ? 'bg-emerald-400 scale-150' : 
                          answered && isChosen ? 'bg-error scale-150' : 
                          'bg-outline-variant/40 group-hover:bg-primary'
                        }`} />
                        <span className={`text-base font-medium transition-colors ${isChosen ? 'text-on-surface' : 'text-on-surface-variant'}`}>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Short Answer (V3 Minimal) */}
              {(q?.type === 'short_answer' || q?.type === 'conceptual') && !answered && (
                <div className="space-y-6 mt-10">
                  <textarea
                    autoFocus
                    className="w-full bg-surface-container-low border border-outline-variant/10 rounded-2xl px-6 py-5 text-base text-on-surface outline-none focus:border-primary/50 transition-all min-h-[200px] resize-none leading-relaxed"
                    placeholder="Formulate your response..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitAnswer(currentQ, (e.target as HTMLTextAreaElement).value);
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const textarea = (e.currentTarget.parentElement?.querySelector('textarea'));
                      if (textarea?.value) submitAnswer(currentQ, textarea.value);
                    }}
                    className="h-14 px-10 rounded-2xl bg-on-surface text-surface-container font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all"
                  >
                    Validate Response
                  </button>
                </div>
              )}

              {/* Explanation (V3 High Contrast) */}
              {showExplanation === currentQ && (
                <div className={`mt-10 p-8 rounded-[1.5rem] border-t-2 animate-in slide-in-from-bottom-4 ${isCorrect ? 'border-emerald-400 bg-emerald-400/5' : 'border-error bg-error/5'}`}>
                  <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 ${isCorrect ? 'text-emerald-400' : 'text-error'}`}>
                    {isCorrect ? 'Verification Successful' : 'Verification Failed'}
                  </h4>
                  <div className="space-y-4">
                    <p className="text-sm font-bold text-on-surface">Target: {q.correct_answer}</p>
                    <p className="text-sm text-on-surface-variant/80 leading-relaxed font-medium">{q.explanation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Nav Controls (4 cols) */}
          <div className="md:col-span-4 space-y-4">
            <div className="bg-surface-container-low rounded-[2rem] border border-outline-variant/10 p-8 space-y-8">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block">Controls</span>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                    disabled={currentQ === 0}
                    className="h-14 flex items-center justify-center rounded-2xl border border-outline-variant/20 text-[10px] font-black uppercase tracking-widest hover:bg-surface-container-high disabled:opacity-20 transition-all"
                  >
                    Prior Query
                  </button>
                  {currentQ < questions.length - 1 ? (
                    <button
                      onClick={() => { setShowExplanation(null); setCurrentQ(currentQ + 1); }}
                      className="h-14 flex items-center justify-center rounded-2xl bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] shadow-xl shadow-primary/20 transition-all"
                    >
                      Next Query
                    </button>
                  ) : (
                    <button
                      onClick={finishQuiz}
                      className="h-14 flex items-center justify-center rounded-2xl bg-on-surface text-surface-container text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] shadow-xl transition-all"
                    >
                      Finalize & Save
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-8 border-t border-outline-variant/5">
                <button 
                  onClick={resetQuiz}
                  className="w-full text-[10px] font-black uppercase tracking-widest text-error/60 hover:text-error transition-colors"
                >
                  Terminate Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULTS VIEW ──
  return (
    <div className="max-w-3xl mx-auto py-20 text-center animate-in zoom-in-95 duration-1000">
      <div className="relative inline-block mb-10">
        <div className="absolute inset-0 bg-primary opacity-20 blur-3xl rounded-full scale-150" />
        <div className="relative z-10 w-48 h-48 rounded-full border-4 border-on-surface flex flex-col items-center justify-center bg-surface-container">
          <span className="text-6xl font-headline font-black italic tracking-tighter text-on-surface">{score}</span>
          <span className="text-[10px] font-black uppercase tracking-widest opacity-30">of {questions.length}</span>
        </div>
      </div>

      <div className="space-y-4 mb-14">
        <h2 className="text-4xl font-headline font-black italic tracking-tighter uppercase text-on-surface">
          {score >= questions.length * 0.8 ? 'Peak Intelligence' : score >= questions.length * 0.5 ? 'Strong Baseline' : 'Growth Required'}
        </h2>
        <p className="text-sm text-on-surface-variant font-medium opacity-60">Session finalized. Results have been recorded to your history.</p>
      </div>

      <div className="flex justify-center flex-wrap gap-4">
        <button
          onClick={resetQuiz}
          className="h-16 px-12 rounded-[2rem] bg-on-surface text-surface-container font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-primary hover:text-on-primary hover:scale-[1.05] transition-all"
        >
          Begin New Session
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="h-16 px-10 rounded-[2rem] border border-outline-variant/40 text-on-surface font-black text-xs uppercase tracking-widest hover:border-on-surface transition-all"
        >
          Dashboard
        </button>
      </div>

      <div className="mt-24 space-y-6 text-left">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 block">Detailed Review</span>
        <div className="space-y-4">
          {questions.map((q, i) => {
            const isCorrect = answers[i]?.toLowerCase() === q.correct_answer?.toLowerCase();
            return (
              <div key={i} className={`p-8 rounded-[2rem] border transition-all ${isCorrect ? 'border-emerald-400/10 bg-emerald-400/5' : 'border-error/10 bg-error/5'}`}>
                <div className="flex gap-6">
                  <div className={`w-1 h-12 rounded-full flex-shrink-0 ${isCorrect ? 'bg-emerald-400' : 'bg-error'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-on-surface mb-2 leading-relaxed">{q.question}</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">Your Response: <span className={isCorrect ? 'text-emerald-400' : 'text-error'}>{answers[i] || 'None'}</span></p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Target: {q.correct_answer}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
