'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUI } from './UIProvider';

type NavItem = 'dashboard' | 'subjects' | 'settings';

const navLinks = [
  { id: 'dashboard' as NavItem, label: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
  { id: 'subjects' as NavItem, label: 'Subjects', icon: 'menu_book', href: '/tasks' },
];

export default function Sidebar({ active }: { active: NavItem }) {
  const router = useRouter();
  const supabase = createClient();
  const { isSidebarHidden, setSidebarHidden, setNewSessionOpen } = useUI();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const closeSidebar = () => {
    setSidebarHidden(true);
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {!isSidebarHidden && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarHidden(true)}
        />
      )}

      <nav
        onMouseLeave={closeSidebar}
        className={`h-screen w-64 fixed left-0 top-0 flex flex-col bg-[#1c1b1d] border-r border-[#494454]/20 z-50 transition-transform duration-200 ${isSidebarHidden ? '-translate-x-full' : 'translate-x-0'}`}
      >
      <div className="flex flex-col h-full py-6">
        {/* Brand */}
        <div className="px-6 mb-8 flex items-center gap-3">
          <Link href="/dashboard" onClick={closeSidebar} className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-white text-[20px]">psychology</span>
            </div>
            <h1 className="text-lg font-bold tracking-tighter text-primary font-headline">AcadAi</h1>
          </Link>
          <p className="text-[10px] font-bold tracking-wider uppercase text-on-surface-variant font-label">Adaptive Learning</p>
        </div>

        {/* Main nav */}
        <ul className="flex flex-col gap-1 px-3 flex-1">
          {navLinks.map((link) => {
            const isActive = active === link.id;
            return (
              <li key={link.id}>
                <Link
                  href={link.href}
                  onClick={closeSidebar}
                  className={`px-4 py-3 flex items-center gap-3 text-sm font-body transition-all duration-200 ${
                    isActive
                       ? 'text-primary font-semibold border-l-2 border-primary bg-surface-container-high rounded-r-lg'
                      : 'text-gray-400 hover:text-primary hover:bg-[#201f22] rounded-lg'
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* New Session CTA */}
        <div className="px-6 mb-6">
          <button
            onClick={() => {
              setNewSessionOpen(true);
              closeSidebar();
            }}
            className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold text-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">timer</span>
            Focus Session
          </button>
        </div>

        {/* Footer nav */}
        <ul className="flex flex-col gap-1 px-3">
          <li>
            <Link
              href="/settings"
              onClick={closeSidebar}
              className={`w-full text-left transition-colors px-4 py-3 flex items-center gap-3 font-body text-sm rounded-lg duration-200 ${active === 'settings' ? 'text-primary bg-surface-container-high' : 'text-gray-400 hover:text-primary hover:bg-[#201f22]'}`}
            >
              <span className="material-symbols-outlined">settings</span>
              Settings
            </Link>
          </li>
          <li>
            <button
              onClick={() => {
                handleSignOut();
                closeSidebar();
              }}
              className="w-full text-left transition-colors px-4 py-3 flex items-center gap-3 font-body text-sm rounded-lg duration-200 text-gray-400 hover:text-red-400 hover:bg-red-400/5"
            >
              <span className="material-symbols-outlined">logout</span>
              Sign Out
            </button>
          </li>
        </ul>
      </div>
    </nav>
    </>
  );
}
