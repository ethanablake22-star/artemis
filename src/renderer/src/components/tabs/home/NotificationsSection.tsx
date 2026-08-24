import React from 'react';
import { Bell, AlertTriangle, CheckCircle, Info, Radio } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'warning' | 'success';
}

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Universal Tab Shell Ready',
    message: 'Task 001 architecture initialized with Electron + React + TypeScript.',
    time: 'Just now',
    type: 'success',
  },
  {
    id: 'n-2',
    title: 'Fleet Telemetry Gateway Update',
    message: 'CAN bus sensor calibration packet verified on vehicle #04.',
    time: '25m ago',
    type: 'info',
  },
  {
    id: 'n-3',
    title: 'Memory Profiler Alert',
    message: 'Renderer process memory footprint well within optimal thresholds (<120MB).',
    time: '1h ago',
    type: 'warning',
  },
];

export const NotificationsSection: React.FC = () => {
  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="bg-artemis-850 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Bell className="w-4 h-4 text-cyan-400" />
          System Notifications
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          Live Stream
        </span>
      </div>

      <div className="space-y-2.5 flex-1">
        {NOTIFICATIONS.map((n) => (
          <div
            key={n.id}
            className="p-3 rounded-lg border border-slate-800/80 bg-artemis-900/50 hover:bg-slate-800/50 transition-all flex items-start gap-3"
          >
            <div className="mt-0.5">{getIcon(n.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200 truncate">{n.title}</span>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">{n.time}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
