'use client';

import Link from 'next/link';
import { useUI } from './UIProvider';

export default function AppTopNav() {
  const { 
    setNewSessionOpen, 
    setNotificationsOpen, 
    notifications, 
    toggleSidebar,
    isTimerActive,
    timerSecondsLeft,
    isTimerRunning
  } = useUI();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-var(--sidebar-width,16rem))] h-16 z-40 bg-[#131315]/85 backdrop-blur-md border-b border-[#494454]/20 flex justify-between items-center px-8 transition-all duration-200">
      <div className="flex items-center gap-6 h-full">
        <button
          onClick={toggleSidebar}
          className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
          aria-label="Toggle sidebar"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
          <h2 className="text-lg font-bold text-primary font-headline tracking-tight">AcadAi</h2>
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden lg:flex items-center w-56 h-9 bg-surface-container-highest rounded-xl ghost-border px-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] mr-2">search</span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder-on-surface-variant/50 p-0 outline-none"
            placeholder="Search..."
            type="text"
          />
        </div>
        
        <button onClick={() => setNotificationsOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors relative">
          <span className="material-symbols-outlined">notifications</span>
          {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />}
        </button>

        <button
          onClick={() => setNewSessionOpen(true)}
          className={`py-2 px-4 rounded-xl ghost-border transition-all duration-300 flex items-center gap-2 text-sm font-semibold ${
            isTimerActive 
              ? 'bg-primary text-on-primary ring-2 ring-primary/20 animate-pulse' 
              : 'bg-surface-container-high text-primary hover:bg-surface-container-highest'
          }`}
        >
          <span className={`material-symbols-outlined text-[18px] ${isTimerRunning ? 'animate-spin-slow' : ''}`}>
            {isTimerActive ? 'timer_3' : 'timer'}
          </span>
          {isTimerActive ? formatTime(timerSecondsLeft) : 'Timer'}
        </button>
      </div>
    </header>
  );
}
