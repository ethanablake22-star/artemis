import React from 'react';
import { Clock, FileText, Code2, Box, Cpu, ChevronRight } from 'lucide-react';
import { useTabs } from '../../../state/TabContext';

interface RecentFileItem {
  id: string;
  name: string;
  type: string;
  size: string;
  lastModified: string;
  icon: React.ReactNode;
}

const RECENT_FILES: RecentFileItem[] = [
  {
    id: 'f-1',
    name: 'artemis_architecture_v1.md',
    type: 'Markdown Document',
    size: '14.2 KB',
    lastModified: '10 mins ago',
    icon: <FileText className="w-4 h-4 text-indigo-400" />,
  },
  {
    id: 'f-2',
    name: 'chassis_suspension_v2.step',
    type: '3D CAD Model',
    size: '42.8 MB',
    lastModified: '2 hours ago',
    icon: <Box className="w-4 h-4 text-purple-400" />,
  },
  {
    id: 'f-3',
    name: 'telemetry_ecu_revB.kicad_pcb',
    type: 'PCB Layout',
    size: '8.4 MB',
    lastModified: 'Yesterday',
    icon: <Cpu className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: 'f-4',
    name: 'can_bus_controller.rs',
    type: 'Rust Source',
    size: '18.1 KB',
    lastModified: '2 days ago',
    icon: <Code2 className="w-4 h-4 text-cyan-400" />,
  },
];

export const RecentFilesSection: React.FC = () => {
  const { openOrFocusTab } = useTabs();

  return (
    <div className="bg-artemis-850 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Clock className="w-4 h-4 text-amber-400" />
          Recent Files
        </div>
        <button
          type="button"
          onClick={() => openOrFocusTab('library')}
          className="text-xs text-artemis-accent hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
        >
          View in Library
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2 flex-1">
        {RECENT_FILES.map((file) => (
          <div
            key={file.id}
            onClick={() => openOrFocusTab('library')}
            className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 bg-artemis-900/50 hover:bg-slate-800/60 hover:border-slate-700 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded bg-artemis-950/80 border border-slate-800 group-hover:border-slate-700 shrink-0">
                {file.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-200 group-hover:text-artemis-accent transition-colors truncate">
                  {file.name}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>{file.type}</span>
                  <span>•</span>
                  <span>{file.size}</span>
                </div>
              </div>
            </div>

            <span className="text-[11px] text-slate-500 font-mono shrink-0 pl-2">
              {file.lastModified}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
