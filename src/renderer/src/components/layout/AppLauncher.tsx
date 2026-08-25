import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutGrid,
  Home,
  FolderOpen,
  Globe,
  FileText,
  Code2,
  Box,
  Cpu,
  Calendar,
  Wrench,
  Search,
  X,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useLauncher } from '../../state/LauncherContext';
import { useTabs } from '../../state/TabContext';
import type { ArtemisTabType } from '@shared/types';
import clsx from 'clsx';

interface LauncherApp {
  id: string;
  type: ArtemisTabType;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'core' | 'tools' | 'engineering';
  enabled: boolean;
  badge?: string;
}

const APPS: LauncherApp[] = [
  {
    id: 'app-home',
    type: 'home',
    title: 'Artemis Home',
    description: 'Mission overview, recent files, active operations, and notifications.',
    icon: <Home className="w-6 h-6 text-artemis-accent" />,
    category: 'core',
    enabled: true,
    badge: 'Core',
  },
  {
    id: 'app-library',
    type: 'library',
    title: 'Library',
    description: 'Universal asset browser, files, project documents, and system media.',
    icon: <FolderOpen className="w-6 h-6 text-amber-400" />,
    category: 'core',
    enabled: true,
  },
  {
    id: 'app-web',
    type: 'web',
    title: 'Chromium Browser',
    description: 'Universal web browser with tabbed navigation and web apps.',
    icon: <Globe className="w-6 h-6 text-blue-400" />,
    category: 'tools',
    enabled: false,
    badge: 'Planned',
  },
  {
    id: 'app-document',
    type: 'document',
    title: 'Documents & Notes',
    description: 'Rich-text specifications, markdown manuals, and spreadsheet sheets.',
    icon: <FileText className="w-6 h-6 text-indigo-400" />,
    category: 'tools',
    enabled: false,
    badge: 'Planned',
  },
  {
    id: 'app-calendar',
    type: 'calendar',
    title: 'Schedule & Calendar',
    description: 'Mission timelines, appointment booking, and dispatch calendar.',
    icon: <Calendar className="w-6 h-6 text-rose-400" />,
    category: 'tools',
    enabled: false,
    badge: 'Planned',
  },
  {
    id: 'app-code',
    type: 'code',
    title: 'Code Editor',
    description: 'Monaco-powered development environment with syntax and tools.',
    icon: <Code2 className="w-6 h-6 text-cyan-400" />,
    category: 'engineering',
    enabled: false,
    badge: 'Planned',
  },
  {
    id: 'app-cad',
    type: 'cad',
    title: 'CAD 3D Modeler',
    description: 'Parametric CAD modeling and mechanical assembly viewer.',
    icon: <Box className="w-6 h-6 text-purple-400" />,
    category: 'engineering',
    enabled: false,
    badge: 'Planned',
  },
  {
    id: 'app-pcb',
    type: 'pcb',
    title: 'PCB Designer',
    description: 'Schematic capture and printed circuit board routing workspace.',
    icon: <Cpu className="w-6 h-6 text-emerald-400" />,
    category: 'engineering',
    enabled: false,
    badge: 'Planned',
  },
  {
    id: 'app-automotive',
    type: 'automotive',
    title: 'Automotive Operations',
    description: 'Customer management, vehicle fleet profiles, repair orders, and diagnostics.',
    icon: <Wrench className="w-6 h-6 text-orange-400" />,
    category: 'engineering',
    enabled: true,
  },
];

export const AppLauncher: React.FC = () => {
  const { isOpen, closeLauncher, toggleLauncher } = useLauncher();
  const { openOrFocusTab } = useTabs();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeLauncher();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeLauncher]);

  const handleLaunchApp = (app: LauncherApp) => {
    if (!app.enabled) return;
    openOrFocusTab(app.type);
    closeLauncher();
  };

  const filteredApps = APPS.filter(
    (app) =>
      app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* 3x3 Grid Launcher Trigger Button */}
      <button
        type="button"
        onClick={toggleLauncher}
        title="Artemis Workspace Launcher"
        aria-label="Artemis Workspace Launcher"
        className={clsx(
          'no-drag flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150',
          isOpen
            ? 'bg-artemis-accent/20 text-artemis-accent ring-1 ring-artemis-accent/40 shadow-sm'
            : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/80 active:bg-slate-700/80'
        )}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>

      {/* Launcher Modal / Dropdown Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 bg-black/60 backdrop-blur-sm animate-fadeIn">
          {/* Backdrop Click */}
          <div className="fixed inset-0" onClick={closeLauncher} />

          {/* Launcher Container */}
          <div
            ref={panelRef}
            className="relative z-10 w-full max-w-2xl bg-artemis-900 border border-slate-700/70 rounded-xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[82vh]"
          >
            {/* Header / Search */}
            <div className="p-4 border-b border-slate-800/80 bg-artemis-950/60 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Artemis applications and workspaces..."
                className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                ESC to close
              </div>
            </div>

            {/* Application List */}
            <div className="p-4 overflow-y-auto space-y-4 max-h-[60vh]">
              {/* Active Apps Section */}
              <div>
                <div className="flex items-center gap-2 mb-2.5 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-artemis-accent" />
                  Available Applications
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredApps
                    .filter((a) => a.enabled)
                    .map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => handleLaunchApp(app)}
                        className="group flex items-start gap-3.5 p-3 rounded-lg border border-slate-800 bg-artemis-950/50 hover:bg-slate-800/60 hover:border-slate-700 transition-all text-left"
                      >
                        <div className="p-2 rounded-lg bg-artemis-900/80 border border-slate-800 group-hover:border-slate-700 group-hover:scale-105 transition-transform shrink-0">
                          {app.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-100 group-hover:text-artemis-accent transition-colors">
                              {app.title}
                            </span>
                            {app.badge && (
                              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30">
                                {app.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {app.description}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              {/* Future Apps Section */}
              {filteredApps.some((a) => !a.enabled) && (
                <div>
                  <div className="flex items-center gap-2 mb-2.5 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <Lock className="w-3.5 h-3.5" />
                    Artemis Ecosystem (Future Modules)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredApps
                      .filter((a) => !a.enabled)
                      .map((app) => (
                        <div
                          key={app.id}
                          className="flex items-start gap-3.5 p-3 rounded-lg border border-slate-800/40 bg-artemis-950/20 opacity-65 text-left cursor-not-allowed"
                        >
                          <div className="p-2 rounded-lg bg-artemis-900/40 border border-slate-800/40 shrink-0">
                            {app.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-300">
                                {app.title}
                              </span>
                              {app.badge && (
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                                  {app.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {app.description}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {filteredApps.length === 0 && (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No applications found matching "{searchQuery}".
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-artemis-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>Artemis Universal Shell</span>
              <span className="font-mono text-[11px]">v0.1.0-alpha</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
