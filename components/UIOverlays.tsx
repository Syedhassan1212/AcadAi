'use client';

import React from 'react';
import { useUI } from './UIProvider';

export default function UIOverlays() {
  const {
    isFocusModeActive, setFocusModeActive,
    isTimerActive,
    isTimerRunning,
    timerSecondsLeft,
    currentSession,
    pauseSession,
    resumeSession,
    stopSession,
    isSettingsOpen, setSettingsOpen,
    isNewSessionOpen, setNewSessionOpen,
    startSession,
    isNotificationsOpen,
    setNotificationsOpen,
    notifications,
    dismissNotification,
    preferences,
    setPreferences
  } = useUI();

  const [selectedDuration, setSelectedDuration] = React.useState(45);
  const [selectedSubject, setSelectedSubject] = React.useState('Deep Work Session');
  const mm = String(Math.floor(timerSecondsLeft / 60)).padStart(2, '0');
  const ss = String(timerSecondsLeft % 60).padStart(2, '0');

  return (
    <>
      {/* Timer Overlay */}
      {isTimerActive && (
        <div className="fixed top-20 right-8 bg-[#1c1b1d] border border-primary/30 shadow-lg shadow-black/40 rounded-xl p-4 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-2 gap-8">
            <h3 className="text-on-surface font-semibold font-headline">Session Timer</h3>
            <button onClick={stopSession} className="text-on-surface-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-black text-primary tabular-nums">{mm}:{ss}</div>
            <div className="flex gap-2">
              <button
                onClick={isTimerRunning ? pauseSession : resumeSession}
                className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">{isTimerRunning ? 'pause' : 'play_arrow'}</span>
              </button>
              <button onClick={stopSession} className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[18px]">stop</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Focus Mode Takeover */}
      {isFocusModeActive && (
        <div className="fixed inset-0 bg-[#131214] z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
          
          <button 
            onClick={() => setFocusModeActive(false)}
            className="absolute top-8 right-8 text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high ghost-border"
          >
            <span className="material-symbols-outlined">fullscreen_exit</span>
            Exit Focus Mode
          </button>

          <div className="text-center z-10 flex flex-col items-center">
            <div className="text-[120px] font-black text-primary tabular-nums tracking-tighter leading-none mb-8 drop-shadow-2xl">
              {mm}:{ss}
            </div>
            <h2 className="text-2xl font-headline font-medium text-on-surface mb-2">Deep Work Session</h2>
            <p className="text-on-surface-variant font-body mb-8">{currentSession?.subject ?? 'No session selected'}</p>
            
            <div className="flex gap-3">
              <button onClick={isTimerRunning ? pauseSession : resumeSession} className="h-14 px-8 rounded-full bg-primary text-on-primary font-bold text-lg hover:bg-primary-fixed hover:-translate-y-1 transition-all shadow-[0_0_20px_rgba(208,188,255,0.3)]">
                {isTimerRunning ? 'Pause' : 'Resume'}
              </button>
              <a href="/tasks" className="h-14 px-6 rounded-full bg-surface-container text-on-surface font-semibold text-lg hover:bg-surface-container-high transition-all flex items-center">
                Open Subjects
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-[#1c1b1d] border border-outline-variant/30 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-[#201f22]">
              <h2 className="text-xl font-headline font-semibold text-on-surface">Settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-on-surface font-body space-y-6">
              <div>
                <h3 className="text-sm font-bold text-primary tracking-wider uppercase mb-3">Preferences</h3>
                <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/10 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-on-surface">Daily Goal</div>
                    <div className="text-sm text-on-surface-variant">Target hours of deep work per day</div>
                  </div>
                  <input
                    type="number"
                    value={preferences.dailyGoalHours}
                    onChange={(e) => setPreferences({ ...preferences, dailyGoalHours: Number(e.target.value) || 1 })}
                    className="w-16 bg-surface-container text-on-surface px-3 py-1.5 rounded-lg border border-outline-variant/30 text-center outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="bg-surface-container-low rounded-lg p-4 border border-outline-variant/10 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-on-surface">Notifications</div>
                  <div className="text-sm text-on-surface-variant">Reminders, streak alerts, and nudges</div>
                </div>
                <button
                  onClick={() => setPreferences({ ...preferences, notificationsEnabled: !preferences.notificationsEnabled })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${preferences.notificationsEnabled ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}
                >
                  {preferences.notificationsEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/20 bg-[#201f22] flex justify-end">
              <button onClick={() => setSettingsOpen(false)} className="px-6 py-2 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-opacity">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Session Modal */}
      {isNewSessionOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-[#1c1b1d] border border-outline-variant/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-outline-variant/20 flex justify-between items-center bg-[#201f22]">
              <h2 className="text-xl font-headline font-semibold text-on-surface">New Session</h2>
              <button onClick={() => setNewSessionOpen(false)} className="text-on-surface-variant hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 text-on-surface font-body space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Focus Subject</label>
                <input
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 text-on-surface rounded-lg px-4 py-2.5 outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Duration (minutes)</label>
                <div className="flex gap-2">
                  {[25, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setSelectedDuration(mins)}
                      className={`flex-1 font-medium py-2 rounded-lg border transition-colors ${selectedDuration === mins ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container text-on-surface border-outline-variant/20 hover:border-primary/50 hover:bg-surface-container-hover'}`}
                    >
                      {mins}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-surface-container-low p-3 border border-outline-variant/20 text-xs text-on-surface-variant">
                Session starts immediately with timer + focus mode, and creates reminders when complete.
              </div>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant/20 bg-[#201f22] flex gap-3 justify-end">
              <button onClick={() => setNewSessionOpen(false)} className="px-4 py-2 text-on-surface-variant font-medium hover:text-on-surface transition-colors">Cancel</button>
              <button
                onClick={() => startSession({ subject: selectedSubject, durationMin: selectedDuration })}
                className="px-6 py-2 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                Start Deep Work
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Drawer */}
      {isNotificationsOpen && (
        <div className="fixed top-16 right-6 w-[360px] max-h-[70vh] overflow-y-auto z-[120] rounded-xl border border-outline-variant/20 bg-[#1c1b1d] shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
            <h3 className="font-semibold text-on-surface">Notifications</h3>
            <button onClick={() => setNotificationsOpen(false)} className="text-on-surface-variant hover:text-primary">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="p-3 space-y-2">
            {notifications.length === 0 && (
              <p className="text-xs text-on-surface-variant p-3">No new notifications.</p>
            )}
            {notifications.map((item) => (
              <div key={item.id} className="rounded-lg bg-surface-container-low p-3 border border-outline-variant/20">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-on-surface font-medium">{item.title}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{item.message}</p>
                  </div>
                  <button onClick={() => dismissNotification(item.id)} className="text-on-surface-variant hover:text-primary">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
