'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="bg-background text-on-background font-body antialiased min-h-screen flex selection:bg-primary/30 selection:text-primary-fixed">
      {/* Left Column: Form */}
      <main className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center px-8 sm:px-16 lg:px-20 bg-surface relative z-10 min-h-screen py-24">
        {/* Brand */}
        <div className="absolute top-8 left-8 sm:left-16 lg:left-20">
          <Link href="/" className="font-headline font-bold text-lg tracking-tighter text-primary">AcadAi</Link>
        </div>

        <div className="max-w-md w-full mx-auto mt-16 lg:mt-0">
          <h1 className="font-headline text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-on-surface mb-2">
            {isLogin ? 'Welcome back' : 'Initialize your flow state'}
          </h1>
          <p className="font-body text-[0.875rem] text-on-surface-variant mb-10">
            {isLogin ? 'Pick up right where you left off.' : 'Join the high-performance study environment engineered for deep focus.'}
          </p>

          {error && (
            <div className="mb-6 bg-error-container text-on-error-container text-sm p-4 rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          )}

          {/* SSO */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <button type="button" onClick={() => handleOAuth('google')} className="flex-1 flex items-center justify-center gap-3 bg-surface-container-high hover:bg-surface-bright transition-colors duration-200 border border-outline-variant/20 rounded-lg py-2.5 px-4 disabled:opacity-50">
              <span className="text-on-surface font-medium text-[0.875rem]">G</span>
              <span className="font-label text-[0.875rem] font-medium text-on-surface">Google</span>
            </button>
            <button type="button" onClick={() => handleOAuth('apple')} className="flex-1 flex items-center justify-center gap-3 bg-surface-container-high hover:bg-surface-bright transition-colors duration-200 border border-outline-variant/20 rounded-lg py-2.5 px-4 disabled:opacity-50">
              <span className="text-on-surface font-medium text-[0.875rem]">⌘</span>
              <span className="font-label text-[0.875rem] font-medium text-on-surface">Apple</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center mb-8">
            <div className="flex-1 h-px bg-outline-variant/20" />
            <span className="px-4 font-label text-[0.6875rem] uppercase tracking-widest text-on-surface-variant">Or via Email</span>
            <div className="flex-1 h-px bg-outline-variant/20" />
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleAuth}>
            <div className="space-y-1.5">
              <label className="font-label text-[0.875rem] font-medium text-on-surface-variant" htmlFor="email">Email Address</label>
              <input
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-3 text-[0.875rem] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all duration-200"
                id="email"
                placeholder="nomad@adaptivestudy.os"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-label text-[0.875rem] font-medium text-on-surface-variant" htmlFor="password">Password</label>
              <input
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-lg px-4 py-3 text-[0.875rem] text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all duration-200"
                id="password"
                placeholder="••••••••"
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>
            <button
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-[0.875rem] font-semibold rounded-lg py-3 hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-50"
              type="submit"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              {!loading && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
            </button>
          </form>

          <p className="mt-8 text-center font-body text-[0.875rem] text-on-surface-variant">
            {isLogin ? "Don't have an account?" : "Already deep in the flow?"}{' '}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:text-primary-fixed transition-colors font-medium">
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        {/* Footer links */}
        <div className="absolute bottom-8 left-8 sm:left-16 lg:left-20 flex gap-4 font-label text-[0.6875rem] text-on-surface-variant uppercase tracking-widest">
          <a href="#" className="hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms</a>
        </div>
      </main>

      {/* Right Column: Editorial */}
      <aside className="hidden lg:flex lg:flex-1 bg-surface-container-low relative overflow-hidden flex-col justify-center">
        {/* Abstract bg */}
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-gradient-to-br from-[#1c1b1d] to-[#0e0e10]" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface-container-low to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-transparent to-transparent" />
        </div>

        {/* Ambient aura */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl px-16 lg:px-24">
          <h2 className="font-headline text-[3.5rem] font-bold leading-[1.1] tracking-[-0.04em] text-on-surface mb-12">
            Structured knowledge. <br />
            <span className="text-primary-fixed-dim">Infinite recall.</span>
          </h2>

          <div className="flex flex-col gap-6">
            {/* Feature 1 */}
            <div className="relative bg-surface-container/85 backdrop-blur-[20px] rounded-xl p-6 pr-8 border border-outline-variant/10 shadow-2xl shadow-black/20 group hover:bg-surface-container-high transition-colors duration-300 w-11/12">
              <div className="absolute left-0 top-6 bottom-6 w-[2px] bg-primary rounded-r-full shadow-[0_0_8px_rgba(208,188,255,0.4)]" />
              <div className="flex items-start gap-5 ml-2">
                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center border border-outline-variant/20 shrink-0">
                  <span className="material-symbols-outlined text-primary">sync</span>
                </div>
                <div>
                  <h3 className="font-headline text-[1.125rem] font-medium tracking-[-0.01em] text-on-surface mb-1">Knowledge Sync</h3>
                  <p className="font-body text-[0.875rem] text-on-surface-variant leading-relaxed">
                    Seamlessly unify disparate notes, lectures, and research into a single, highly structured neural graph without lifting a finger.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="relative bg-surface-container/85 backdrop-blur-[20px] rounded-xl p-6 pr-8 border border-outline-variant/10 shadow-2xl shadow-black/20 group hover:bg-surface-container-high transition-colors duration-300 ml-12">
              <div className="absolute left-0 top-6 bottom-6 w-[2px] bg-surface-variant rounded-r-full group-hover:bg-primary/50 transition-colors" />
              <div className="flex items-start gap-5 ml-2">
                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center border border-outline-variant/20 shrink-0">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                </div>
                <div>
                  <h3 className="font-headline text-[1.125rem] font-medium tracking-[-0.01em] text-on-surface mb-1">AI Synthesis</h3>
                  <p className="font-body text-[0.875rem] text-on-surface-variant leading-relaxed">
                    Condense hours of raw study material into high-yield, conceptual insights in milliseconds. Stop summarizing, start learning.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
