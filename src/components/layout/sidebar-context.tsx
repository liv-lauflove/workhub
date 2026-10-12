'use client';

import * as React from 'react';

const SIDEBAR_STORAGE_KEY = 'workhub:sidebar-collapsed';
const SIDEBAR_CHANGE_EVENT = 'workhub:sidebar-change';

interface SidebarContextValue {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = React.createContext<SidebarContextValue | undefined>(
  undefined
);

function subscribeToSidebar(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, callback);
  };
}

function getSidebarSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getSidebarServerSnapshot(): boolean {
  return false;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const isCollapsed = React.useSyncExternalStore(
    subscribeToSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot
  );

  const setCollapsed = React.useCallback((collapsed: boolean) => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
      window.dispatchEvent(new CustomEvent(SIDEBAR_CHANGE_EVENT));
    } catch {
      // Ignore localStorage write failures (e.g. private browsing mode)
    }
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setCollapsed(!getSidebarSnapshot());
  }, [setCollapsed]);

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      isCollapsed,
      toggleSidebar,
      setCollapsed,
    }),
    [isCollapsed, toggleSidebar, setCollapsed]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
