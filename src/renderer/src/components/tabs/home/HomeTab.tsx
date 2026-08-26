import React from 'react';
import { Calendar } from 'lucide-react';
import { CurrentMissionHero } from './CurrentMissionHero';
import { TodayScheduleSection } from './TodayScheduleSection';
import { NeedsAttentionSection } from './NeedsAttentionSection';
import { ActiveWorkSection } from './ActiveWorkSection';
import { RecentDocumentsSection } from './RecentDocumentsSection';
import { QuickAccessSection } from './QuickAccessSection';

export const HomeTab: React.FC = () => {
  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="h-full w-full overflow-y-auto bg-artemis-950 text-zinc-100 select-none">
      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-silver-400">
                Artemis Command Center
              </span>
              <span className="text-[11px] font-mono text-zinc-500">•</span>
              <span className="text-[11px] font-mono text-zinc-400">
                Silent Lane Engineering
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-zinc-100 tracking-tight mt-0.5">
              Daily Operational Cockpit
            </h1>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-artemis-900 border border-zinc-800 text-xs font-mono text-zinc-300 self-start sm:self-auto shadow-sm">
            <Calendar className="w-4 h-4 text-silver-400" />
            <span>{todayFormatted}</span>
          </div>
        </div>

        {/* 1. Current Mission Hero */}
        <CurrentMissionHero />

        {/* 2. Today's Schedule & Needs Attention Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <TodayScheduleSection />
          <NeedsAttentionSection />
        </div>

        {/* 3. Active Work & Recent Documents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <ActiveWorkSection />
          <RecentDocumentsSection />
        </div>

        {/* 4. Quick Access Shortcuts */}
        <QuickAccessSection />
      </div>
    </div>
  );
};
