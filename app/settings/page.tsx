'use client';

import Sidebar from '@/components/Sidebar';
import AppTopNav from '@/components/AppTopNav';
import { useUI } from '@/components/UIProvider';

export default function SettingsPage() {
  const { preferences, setPreferences } = useUI();

  return (
    <div className="antialiased min-h-screen flex bg-background text-on-background selection:bg-primary-container selection:text-on-primary-container">
      <Sidebar active="settings" />
      <div className="flex-1 flex flex-col app-shell-offset min-h-screen">
        <AppTopNav />
        <main className="flex-1 pt-24 px-4 md:px-12 pb-12 w-full max-w-4xl">
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface mb-6">Settings</h1>
          <div className="space-y-4">
            <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20">
              <p className="text-sm text-on-surface-variant mb-2">Study hours per day</p>
              <input
                type="number"
                min={1}
                max={12}
                value={preferences.dailyGoalHours}
                onChange={(e) => setPreferences({ ...preferences, dailyGoalHours: Number(e.target.value) || 1 })}
                className="w-20 bg-surface border border-outline-variant/30 rounded px-3 py-2"
              />
            </div>
            <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20">
              <p className="text-sm text-on-surface-variant mb-3">Notifications</p>
              <button
                onClick={() => setPreferences({ ...preferences, notificationsEnabled: !preferences.notificationsEnabled })}
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${preferences.notificationsEnabled ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface-variant'}`}
              >
                {preferences.notificationsEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
            <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20">
              <p className="text-sm text-on-surface-variant mb-3">AI response style</p>
              <select
                value={preferences.aiStyle}
                onChange={(e) => setPreferences({ ...preferences, aiStyle: e.target.value as 'concise' | 'balanced' | 'detailed' })}
                className="bg-surface border border-outline-variant/30 rounded px-3 py-2"
              >
                <option value="concise">Concise</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
