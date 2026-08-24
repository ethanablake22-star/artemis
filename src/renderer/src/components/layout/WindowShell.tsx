import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import { TabBar } from './TabBar';
import { AppLauncher } from './AppLauncher';

interface WindowShellProps {
  children: React.ReactNode;
}

export const WindowShell: React.FC<WindowShellProps> = ({ children }) => {
  const handleMinimize = () => {
    window.artemisAPI?.minimize();
  };

  const handleMaximize = () => {
    window.artemisAPI?.maximize();
  };

  const handleClose = () => {
    window.artemisAPI?.close();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-artemis-950 text-slate-100 overflow-hidden">
      {/* Top Application Header / Tab Bar Strip */}
      <header className="titlebar-drag-region h-11 bg-artemis-950 border-b border-slate-800/80 flex items-center px-2.5 gap-2 shrink-0 select-none">
        {/* Artemis Brand & App Launcher */}
        <div className="flex items-center gap-2 pr-1 shrink-0 no-drag">
          {/* Artemis Monogram Icon */}
          <div className="flex items-center gap-2 pl-1 pr-1.5 py-1">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm shadow-cyan-500/30 text-white font-black text-xs">
              A
            </div>
            <span className="font-bold tracking-wider text-xs bg-clip-text text-transparent bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400">
              ARTEMIS
            </span>
          </div>

          {/* 3x3 App Launcher */}
          <AppLauncher />
        </div>

        {/* Browser-style Tab Strip */}
        <div className="flex-1 min-w-0 flex items-center">
          <TabBar />
        </div>

        {/* Desktop Window Controls */}
        <div className="flex items-center gap-1 pl-2 shrink-0 no-drag">
          <button
            type="button"
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
            title="Minimize"
            aria-label="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleMaximize}
            className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
            title="Maximize"
            aria-label="Maximize"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Close"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Tab Content Viewport */}
      <main className="flex-1 min-h-0 bg-artemis-900 overflow-hidden relative">
        {children}
      </main>

      {/* Global Desktop Status Bar */}
      <footer className="h-6 bg-artemis-950 border-t border-slate-800/80 px-3 flex items-center justify-between text-[11px] text-slate-400 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Core System Online
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">Universal Tab Shell</span>
        </div>

        <div className="flex items-center gap-3 text-slate-400 font-mono text-[10px]">
          <span>Electron + React + TypeScript</span>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400">Artemis v0.1.0</span>
        </div>
      </footer>
    </div>
  );
};
