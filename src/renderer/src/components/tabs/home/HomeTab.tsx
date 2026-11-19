import React, { useState } from 'react';
import { Calendar, Download, ShieldCheck } from 'lucide-react';
import { CurrentMissionHero } from './CurrentMissionHero';
import { TodayScheduleSection } from './TodayScheduleSection';
import { NeedsAttentionSection } from './NeedsAttentionSection';
import { ActiveWorkSection } from './ActiveWorkSection';
import { RecentDocumentsSection } from './RecentDocumentsSection';
import { QuickAccessSection } from './QuickAccessSection';

export const HomeTab: React.FC = () => {
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const runBackup = async (operation: 'export' | 'verify') => {
    if (!window.artemisAPI?.backup) {
      setBackupMessage('Backup tools require the Artemis desktop app.');
      return;
    }
    setBackupBusy(true);
    setBackupMessage('');
    try {
      const result = await window.artemisAPI.backup[operation]();
      if (!result.canceled) {
        setBackupMessage((operation === 'export' ? 'Backup exported' : 'Backup verified') +
          ': ' + (result.fileCount ?? 0) + ' data stores. ' + (result.path ?? ''));
      }
    } catch (error) {
      setBackupMessage(error instanceof Error ? error.message : 'Backup operation failed.');
    } finally {
      setBackupBusy(false);
    }
  };
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

        {/* User-controlled, read-only backup and verification. Restores are not enabled. */}
        <section className="rounded-xl border border-zinc-800 bg-artemis-900 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-zinc-100">Data protection</h2>
              <p className="mt-1 text-xs text-zinc-400">Export or verify a local Artemis backup. Close open document edits before exporting. Backups are unencrypted and should be stored securely.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void runBackup('export')} disabled={backupBusy} className="inline-flex items-center gap-2 rounded-lg bg-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-white disabled:opacity-50"><Download className="h-4 w-4" />Export backup</button>
              <button type="button" onClick={() => void runBackup('verify')} disabled={backupBusy} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"><ShieldCheck className="h-4 w-4" />Verify file</button>
            </div>
          </div>
          {backupMessage && <p role="status" className="mt-3 break-all text-xs text-zinc-300">{backupMessage}</p>}
        </section>

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
