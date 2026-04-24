'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

type Session = {
  subject: string;
  durationMin: number;
};

type UserPreferences = {
  dailyGoalHours: number;
  notificationsEnabled: boolean;
  aiStyle: 'concise' | 'balanced' | 'detailed';
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
};

type UIContextType = {
  isFocusModeActive: boolean;
  setFocusModeActive: (active: boolean) => void;
  isTimerActive: boolean;
  setTimerActive: (active: boolean) => void;
  isTimerRunning: boolean;
  timerSecondsLeft: number;
  currentSession: Session | null;
  startSession: (session: Session) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  stopSession: () => void;
  isSettingsOpen: boolean;
  setSettingsOpen: (active: boolean) => void;
  isNewSessionOpen: boolean;
  setNewSessionOpen: (active: boolean) => void;
  isNotificationsOpen: boolean;
  setNotificationsOpen: (active: boolean) => void;
  notifications: NotificationItem[];
  dismissNotification: (id: string) => void;
  preferences: UserPreferences;
  setPreferences: (next: UserPreferences) => void;
  isSidebarHidden: boolean;
  setSidebarHidden: (hidden: boolean) => void;
  toggleSidebar: () => void;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [isFocusModeActive, setFocusModeActive] = useState(false);
  const [isTimerActive, setTimerActive] = useState(false);
  const [isTimerRunning, setTimerRunning] = useState(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(0);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isNewSessionOpen, setNewSessionOpen] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isSidebarHidden, setSidebarHidden] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('adaptive-study-os-sidebar-hidden');
      if (stored === '1') setSidebarHidden(true);
    } catch (err) {
      console.error('Failed to load sidebar state', err);
    }
  }, []);
  const [preferences, setPreferencesState] = useState<UserPreferences>({
    dailyGoalHours: 4,
    notificationsEnabled: true,
    aiStyle: 'balanced',
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('adaptive-study-os-preferences');
      if (raw) {
        const parsed = JSON.parse(raw) as UserPreferences;
        setPreferencesState(parsed);
      }
    } catch (error) {
      console.error('Failed to load preferences from localStorage', error);
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', isSidebarHidden ? '0px' : '16rem');
    document.documentElement.setAttribute('data-sidebar-hidden', isSidebarHidden ? '1' : '0');
  }, [isSidebarHidden]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      } catch (error) {
        console.error('Failed to load notifications', error);
      }
    };

    loadNotifications();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (!isTimerRunning || prev <= 0) return prev;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning]);

  useEffect(() => {
    if (timerSecondsLeft !== 0) return;
    if (!isTimerRunning) return;

    setTimerRunning(false);
    setFocusModeActive(false);
    if (preferences.notificationsEnabled) {
      setNotifications((prev) => [
        {
          id: crypto.randomUUID(),
          title: 'Session completed',
          message: `${currentSession?.subject ?? 'Study'} session is finished.`,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setNotificationsOpen(true);
    }
  }, [timerSecondsLeft, isTimerRunning, preferences.notificationsEnabled, currentSession]);

  const setPreferences = (next: UserPreferences) => {
    setPreferencesState(next);
    try {
      localStorage.setItem('adaptive-study-os-preferences', JSON.stringify(next));
    } catch (error) {
      console.error('Failed to persist preferences', error);
    }
  };

  const setSidebarHiddenState = (hidden: boolean) => {
    setSidebarHidden(hidden);
    try {
      localStorage.setItem('adaptive-study-os-sidebar-hidden', hidden ? '1' : '0');
    } catch (error) {
      console.error('Failed to persist sidebar state', error);
    }
  };

  const toggleSidebar = () => setSidebarHiddenState(!isSidebarHidden);

  const startSession = (session: Session) => {
    const safeDuration = Math.max(5, Math.min(120, session.durationMin));
    setCurrentSession({ ...session, durationMin: safeDuration });
    setTimerSecondsLeft(safeDuration * 60);
    setTimerRunning(true);
    setTimerActive(true);
    setFocusModeActive(true);
    setNewSessionOpen(false);
  };

  const pauseSession = () => setTimerRunning(false);
  const resumeSession = () => {
    if (timerSecondsLeft > 0) setTimerRunning(true);
  };
  const stopSession = () => {
    setTimerRunning(false);
    setTimerActive(false);
    setFocusModeActive(false);
    setCurrentSession(null);
    setTimerSecondsLeft(0);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const contextValue = useMemo(
    () => ({
      isFocusModeActive,
      setFocusModeActive,
      isTimerActive,
      setTimerActive,
      isTimerRunning,
      timerSecondsLeft,
      currentSession,
      startSession,
      pauseSession,
      resumeSession,
      stopSession,
      isSettingsOpen,
      setSettingsOpen,
      isNewSessionOpen,
      setNewSessionOpen,
      isNotificationsOpen,
      setNotificationsOpen,
      notifications,
      dismissNotification,
      preferences,
      setPreferences,
      isSidebarHidden,
      setSidebarHidden: setSidebarHiddenState,
      toggleSidebar,
    }),
    [
      isFocusModeActive,
      isTimerActive,
      isTimerRunning,
      timerSecondsLeft,
      currentSession,
      isSettingsOpen,
      isNewSessionOpen,
      isNotificationsOpen,
      notifications,
      preferences,
      isSidebarHidden,
    ]
  );

  return (
    <UIContext.Provider value={contextValue}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
