import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface LauncherContextValue {
  isOpen: boolean;
  openLauncher: () => void;
  closeLauncher: () => void;
  toggleLauncher: () => void;
}

const LauncherContext = createContext<LauncherContextValue | null>(null);

export const LauncherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openLauncher = useCallback(() => setIsOpen(true), []);
  const closeLauncher = useCallback(() => setIsOpen(false), []);
  const toggleLauncher = useCallback(() => setIsOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({
      isOpen,
      openLauncher,
      closeLauncher,
      toggleLauncher,
    }),
    [isOpen, openLauncher, closeLauncher, toggleLauncher]
  );

  return <LauncherContext.Provider value={value}>{children}</LauncherContext.Provider>;
};

export const useLauncher = (): LauncherContextValue => {
  const context = useContext(LauncherContext);
  if (!context) {
    throw new Error('useLauncher must be used within a LauncherProvider');
  }
  return context;
};
