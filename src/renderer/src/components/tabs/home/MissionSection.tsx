import React from 'react';
import { Target, CheckCircle2, Flame } from 'lucide-react';

export const MissionSection: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-artemis-850 to-artemis-900 border border-slate-700/60 rounded-xl p-5 shadow-lg relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-artemis-accent">
            <Target className="w-4 h-4" />
            Current Mission
          </div>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            Phase 1: Shell Foundation
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <span>Artemis Platform Initialization</span>
              <Flame className="w-5 h-5 text-amber-400 shrink-0" />
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Universal desktop platform combining Chromium browsing, engineering suites, documents, scheduling, and automotive service management into a unified tabbed ecosystem.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-xs text-slate-400">Milestone Progress</div>
              <div className="text-lg font-bold font-mono text-slate-100">100%</div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-artemis-accent flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Mission Objectives Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Universal Tab Model</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>App Launcher & Singleton Tabs</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Home & Library Workspaces</span>
          </div>
        </div>
      </div>
    </div>
  );
};
