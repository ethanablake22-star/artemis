import React from 'react';
import { Activity } from 'lucide-react';

interface WorkItem {
  id: string;
  title: string;
  project: string;
  progress: number;
  status: 'In Progress' | 'Review' | 'Queued';
  statusColor: string;
}

const ACTIVE_WORK: WorkItem[] = [
  {
    id: 'w-1',
    title: 'Universal Tab Model & App Launcher Implementation',
    project: 'Artemis Core',
    progress: 95,
    status: 'In Progress',
    statusColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  {
    id: 'w-2',
    title: 'Suspension Dynamic Load Simulation',
    project: 'EV Platform V2',
    progress: 60,
    status: 'In Progress',
    statusColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  {
    id: 'w-3',
    title: 'BMS High Voltage Routing Review',
    project: 'Hardware Lab',
    progress: 40,
    status: 'Review',
    statusColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
];

export const ActiveWorkSection: React.FC = () => {
  return (
    <div className="bg-artemis-850 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Activity className="w-4 h-4 text-emerald-400" />
          Active Work & Projects
        </div>
        <span className="text-xs text-slate-500 font-mono">3 Active</span>
      </div>

      <div className="space-y-3 flex-1">
        {ACTIVE_WORK.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-lg border border-slate-800/80 bg-artemis-900/50 hover:bg-slate-800/50 transition-all flex flex-col gap-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  {item.project}
                </span>
                <h4 className="text-xs font-semibold text-slate-200 mt-0.5">{item.title}</h4>
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${item.statusColor}`}
              >
                {item.status}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Completion</span>
                <span>{item.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
