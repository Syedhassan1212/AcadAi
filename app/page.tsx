import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }
  return (
    <div className="bg-background text-on-background font-body antialiased selection:bg-primary-container selection:text-on-primary-container">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-[#131315]/85 backdrop-blur-xl">
        <div className="flex justify-between items-center max-w-7xl mx-auto px-8 h-16">
          <div className="text-lg font-bold tracking-tighter text-primary">AcadAi</div>
          <div className="hidden md:flex items-center gap-8 font-medium text-sm tracking-tight">
            <a href="#hero" className="text-primary border-b-2 border-primary pb-1 hover:bg-[#1c1b1d] transition-all duration-300">Platform</a>
            <a href="#features" className="text-slate-400 hover:text-slate-200 hover:bg-[#1c1b1d] transition-all duration-300">Features</a>
            <a href="#architecture" className="text-slate-400 hover:text-slate-200 hover:bg-[#1c1b1d] transition-all duration-300">Architecture</a>
            <a href="#pricing" className="text-slate-400 hover:text-slate-200 hover:bg-[#1c1b1d] transition-all duration-300">Pricing</a>
          </div>
          <div className="flex items-center gap-4 font-medium text-sm tracking-tight">
            <Link href="/login" className="text-slate-400 hover:text-slate-200 hidden md:block">Sign In</Link>
            <Link href="/login" className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-4 py-2 rounded-DEFAULT hover:scale-95 duration-150 transition-all font-semibold">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16 pb-16 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Hero */}
        <section id="hero" className="flex flex-col md:flex-row items-center justify-between gap-12 py-6 md:py-12 min-h-[60vh]">
          <div className="flex-1 space-y-6">
            <h1 className="font-headline text-[3.5rem] font-bold leading-tight tracking-[-0.04em] text-on-background">
              Your study material, <br />
              <span className="text-primary">turned into an adaptive learning system.</span>
            </h1>
            <p className="font-body text-[1.125rem] text-on-surface-variant max-w-xl font-medium tracking-[-0.01em]">
              Upload your raw notes, PDFs, and lectures. AcadAi engine analyzes the content, plans an optimized review schedule, and continuously adapts to your performance.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <Link href="/login" className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-3 rounded-DEFAULT font-semibold text-[0.875rem] hover:opacity-90 transition-opacity flex items-center gap-2">
                Start Flow State <span className="material-symbols-outlined text-[1.125rem]">arrow_forward</span>
              </Link>
              <Link href="#architecture" className="bg-surface-container-high border border-outline-variant/20 text-on-surface px-8 py-3 rounded-DEFAULT font-semibold text-[0.875rem] hover:bg-surface-container-highest transition-colors">
                View Architecture
              </Link>
            </div>
          </div>

          <div className="flex-1 relative w-full aspect-square md:aspect-auto md:h-[600px] rounded-lg overflow-hidden bg-surface-container border border-outline-variant/10">
            <div className="absolute inset-0 bg-primary/5 mix-blend-overlay" />
            <div className="w-full h-full bg-gradient-to-br from-[#1c1b1d] to-[#131315] flex items-center justify-center">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #d0bcff 0%, transparent 70%)' }} />
            </div>
            {/* OS feel overlays */}
            <div className="absolute top-8 left-8 right-8 bottom-8 pointer-events-none flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="bg-surface-container-highest/80 backdrop-blur-md px-3 py-1.5 rounded text-[0.6875rem] font-label font-semibold uppercase tracking-widest text-primary border border-outline-variant/20 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Engine Active
                </div>
                <div className="text-on-surface-variant text-[0.6875rem] font-mono">v2.4.1</div>
              </div>
              <div className="space-y-3">
                <div className="bg-surface-container-highest/80 backdrop-blur-md p-4 rounded border border-outline-variant/20 w-64 transform -translate-x-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-primary text-sm">memory</span>
                    <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">Processing Node A</span>
                  </div>
                  <div className="h-1 w-full bg-surface-container-low rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-3/4" />
                  </div>
                </div>
                <div className="bg-surface-container-highest/80 backdrop-blur-md p-4 rounded border border-outline-variant/20 w-72 transform translate-x-12">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-primary text-sm">network_node</span>
                    <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">Knowledge Graph Sync</span>
                  </div>
                  <div className="h-1 w-full bg-surface-container-low rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Operating Cycle */}
        <section id="features" className="py-12">
          <div className="mb-6">
            <h2 className="font-headline text-[1.5rem] font-semibold tracking-[-0.02em] text-on-background mb-1">The Operating Cycle</h2>
            <p className="font-body text-[0.875rem] text-on-surface-variant max-w-2xl">A closed-loop system designed to ingest raw data and output retained knowledge.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-surface-container-low rounded-lg p-8 relative overflow-hidden group hover:bg-surface-container transition-colors">
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex flex-col h-full justify-between z-10 relative">
                <div>
                  <span className="material-symbols-outlined text-primary text-3xl mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_upload</span>
                  <h3 className="font-headline text-[1.125rem] font-medium tracking-[-0.01em] text-on-surface mb-2">01. Upload & Analyze</h3>
                  <p className="font-body text-[0.875rem] text-on-surface-variant w-2/3">Drop any material. The system parses text, identifies core concepts, and maps dependencies.</p>
                </div>
                <div className="mt-8 flex gap-2">
                  <span className="px-2 py-1 bg-surface-container text-on-surface text-[0.6875rem] font-semibold uppercase tracking-widest rounded border border-outline-variant/20">PDF</span>
                  <span className="px-2 py-1 bg-surface-container text-on-surface text-[0.6875rem] font-semibold uppercase tracking-widest rounded border border-outline-variant/20">DOCX</span>
                  <span className="px-2 py-1 bg-surface-container text-on-surface text-[0.6875rem] font-semibold uppercase tracking-widest rounded border border-outline-variant/20">Video Transcripts</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low rounded-lg p-8 relative overflow-hidden group hover:bg-surface-container transition-colors">
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex flex-col h-full">
                <span className="material-symbols-outlined text-primary text-3xl mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                <h3 className="font-headline text-[1.125rem] font-medium tracking-[-0.01em] text-on-surface mb-2">02. Plan</h3>
                <p className="font-body text-[0.875rem] text-on-surface-variant">Algorithmic scheduling based on spaced repetition intervals.</p>
              </div>
            </div>

            <div className="md:col-span-3 bg-surface-container-low rounded-lg p-8 relative overflow-hidden group hover:bg-surface-container transition-colors flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="max-w-xl">
                <span className="material-symbols-outlined text-primary text-3xl mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                <h3 className="font-headline text-[1.125rem] font-medium tracking-[-0.01em] text-on-surface mb-2">03. Continuous Adaptation</h3>
                <p className="font-body text-[0.875rem] text-on-surface-variant mb-4">The engine recalibrates daily. If you struggle with a concept, it re-weights the knowledge graph and surfaces prerequisites.</p>
                <a href="#" className="text-primary text-[0.875rem] font-semibold hover:text-primary-container flex items-center gap-1">Read the Whitepaper <span className="material-symbols-outlined text-sm">chevron_right</span></a>
              </div>
              <div className="w-full md:w-1/3 h-32 bg-surface-container rounded border border-outline-variant/10 flex items-end justify-between p-4 gap-2">
                <div className="w-1/6 bg-primary/20 h-1/4 rounded-t" />
                <div className="w-1/6 bg-primary/40 h-2/4 rounded-t" />
                <div className="w-1/6 bg-primary/60 h-3/4 rounded-t" />
                <div className="w-1/6 bg-primary/80 h-full rounded-t" />
                <div className="w-1/6 bg-primary h-5/6 rounded-t shadow-[0_0_15px_rgba(208,188,255,0.3)]" />
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
        <section id="architecture" className="py-12 relative">
          <div className="absolute inset-0 bg-primary/5 rounded-[3rem] blur-3xl -z-10 transform translate-y-20" />
          <div className="text-center mb-8">
            <h2 className="font-headline text-[2.5rem] font-bold tracking-tight text-on-background mb-2">The Engine Architecture</h2>
            <p className="font-body text-[1.125rem] text-on-surface-variant max-w-2xl mx-auto">A multi-layered intelligence system designed for academic high-performance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4 overflow-hidden">
            {[
              { id: '01', title: 'Data Ingestion', desc: 'Parses raw PDFs, Docs, and Transcripts into structured tokens.', icon: 'database' },
              { id: '02', title: 'DAG Mapping', desc: 'Identifies concept dependencies and builds your unique knowledge graph.', icon: 'account_tree' },
              { id: '03', title: 'Neural Planning', desc: 'Algorithmic focus scheduling based on your performance vectors.', icon: 'psychology' },
              { id: '04', title: 'Adaptation', desc: 'Continuous feedback loop that recalibrates your roadmap daily.', icon: 'refresh' },
            ].map((node, i) => (
              <div key={node.id} className="relative p-8 bg-surface-container-low border border-outline-variant/10 rounded-2xl group hover:border-primary/30 transition-all duration-500">
                {i < 3 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-20">
                    <span className="material-symbols-outlined text-primary/30 font-black animate-pulse">arrow_forward</span>
                  </div>
                )}
                <div className="text-[3rem] font-black text-primary/5 absolute -top-4 -left-2 tracking-tighter group-hover:text-primary/10 transition-colors">{node.id}</div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-2xl">{node.icon}</span>
                </div>
                <h3 className="font-headline text-lg font-bold text-on-surface mb-3">{node.title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{node.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-12 bg-gradient-to-b from-transparent to-surface-container-lowest">
          <div className="flex flex-col md:flex-row gap-16">
            <div className="md:w-1/3">
              <h2 className="font-headline text-[1.5rem] font-semibold tracking-[-0.02em] text-on-background mb-4">Field Reports</h2>
              <p className="font-body text-[0.875rem] text-on-surface-variant">High-performance students utilizing the engine to bypass traditional studying limits.</p>
            </div>
            <div className="md:w-2/3 space-y-8">
              <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant/10">
                <p className="font-body text-[0.875rem] text-on-surface italic mb-6">"It stripped away the meta-work of studying. I no longer plan what to review; I just log in and execute the daily sequence."</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-primary font-bold text-sm">JD</div>
                  <div>
                    <div className="font-semibold text-[0.875rem] text-on-background">James D.</div>
                    <div className="text-[0.6875rem] font-label font-semibold uppercase tracking-widest text-on-surface-variant">Med Student, M2</div>
                  </div>
                </div>
              </div>
              <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant/10 ml-0 md:ml-12">
                <p className="font-body text-[0.875rem] text-on-surface italic mb-6">"The knowledge graph restructuring helped me realize I was failing advanced physics because I had a fundamental gap in my calculus nodes from two years prior."</p>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-primary font-bold text-sm">SK</div>
                  <div>
                    <div className="font-semibold text-[0.875rem] text-on-background">Sarah K.</div>
                    <div className="text-[0.6875rem] font-label font-semibold uppercase tracking-widest text-on-surface-variant">Engineering</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16">
          <div className="text-center mb-8">
            <h2 className="font-headline text-[2.5rem] font-bold tracking-tight text-on-background mb-2">Simple, Scalable Pricing</h2>
            <p className="font-body text-[1.125rem] text-on-surface-variant">Built for everyone from solo students to high-performance labs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { 
                plan: 'Core', price: 'Free', 
                desc: 'Perfect for getting started.',
                features: ['3 Active Subjects', 'Basic AI Summaries', '250MB Storage', 'Community Support'] 
              },
              { 
                plan: 'Pro', price: '$12', 
                desc: 'Maximum academic throughput.',
                featured: true,
                features: ['Unlimited Subjects', 'Priority Engine Queue', 'Detailed Mastery Analytics', 'Unlimited Storage', 'Advanced Task DAGs'] 
              },
              { 
                plan: 'Lab', price: 'Custom', 
                desc: 'For high-performance teams.',
                features: ['Shared Knowledge Graphs', 'Team Collaboration', 'API Access', 'SSO & Advanced Security', 'White-glove Onboarding'] 
              }
            ].map((p) => (
              <div key={p.plan} className={`relative p-10 rounded-[2rem] border transition-all duration-300 flex flex-col ${p.featured ? 'bg-surface-container border-primary shadow-[0_0_80px_rgba(208,188,255,0.1)] scale-105 z-10' : 'bg-surface-container-low border-outline-variant/10 hover:border-outline-variant/30'}`}>
                {p.featured && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-on-primary px-4 py-1 rounded-full text-[0.6875rem] font-bold uppercase tracking-widest">Most Popular</div>
                )}
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-[0.2em] mb-2">{p.plan}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-4xl font-black text-on-surface">{p.price}</span>
                    {p.price !== 'Free' && p.price !== 'Custom' && <span className="text-on-surface-variant font-medium">/mo</span>}
                  </div>
                  <p className="text-sm text-on-surface-variant">{p.desc}</p>
                </div>
                <div className="space-y-4 mb-10 flex-1">
                  {p.features.map(f => (
                    <div key={f} className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                      <span className="text-sm text-on-surface-variant font-medium">{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/login" className={`w-full py-4 rounded-xl font-bold text-center transition-all ${p.featured ? 'bg-primary text-on-primary hover:opacity-90' : 'bg-surface-container-highest text-on-surface hover:bg-surface-container-low border border-outline-variant/20'}`}>
                  {p.price === 'Custom' ? 'Contact Sales' : 'Start Now'}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 text-center">
          <h2 className="font-headline text-[2.5rem] font-bold tracking-[-0.04em] text-on-background mb-6">Enter Flow State.</h2>
          <p className="font-body text-[1.125rem] text-on-surface-variant max-w-2xl mx-auto mb-10">Stop managing your study materials. Let the engine manage your knowledge acquisition.</p>
          <Link href="/login" className="inline-block bg-gradient-to-r from-primary to-primary-container text-on-primary px-10 py-4 rounded-DEFAULT font-semibold text-[1rem] hover:scale-95 duration-150 transition-all shadow-[0_0_40px_rgba(208,188,255,0.15)]">
            Get Started Now
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#131315] w-full py-12 mt-20">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-sm font-black text-slate-200">AcadAi</div>
          <div className="flex flex-wrap justify-center gap-6 text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-500">
            <a href="#" className="hover:text-primary transition-colors">Documentation</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Status</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
            <a href="#" className="hover:text-primary transition-colors">Changelog</a>
          </div>
          <div className="text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-500 text-center md:text-right">
            © 2024 AcadAi. Engineered for high-performance flow.
          </div>
        </div>
      </footer>
    </div>
  );
}
