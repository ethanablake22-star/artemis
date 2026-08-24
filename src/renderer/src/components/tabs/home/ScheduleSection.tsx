import React from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface ScheduleEvent {
  id: string;
  time: string;
  title: string;
  location: string;
  tag: string;
  tagColor: string;
}

const EVENTS: ScheduleEvent[] = [
  {
    id: 'e-1',
    time: '09:00 - 10:00',
    title: 'Fleet Telemetry Diagnostics Review',
    location: 'Engineering Bay 3',
    tag: 'Automotive',
    tagColor: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  {
    id: 'e-2',
    time: '11:30 - 12:30',
    title: 'PCB Thermal & Power Integrity Walkthrough',
    location: 'Lab Station Alpha',
    tag: 'Hardware',
    tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  {
    id: 'e-3',
    time: '14:00 - 15:00',
    title: 'Artemis Tab Shell Verification & Review',
    location: 'Mission Control Virtual',
    tag: 'Core Dev',
    tagColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
];

export const ScheduleSection: React.FC = () => {
  return (
    <div className="bg-artemis-850 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Calendar className="w-4 h-4 text-rose-400" />
          Schedule & Timeline
        </div>
        <span className="text-xs text-slate-400 font-mono">Today, Aug 24</span>
      </div>

      <div className="space-y-2.5 flex-1">
        {EVENTS.map((event) => (
          <div
            key={event.id}
            className="p-3 rounded-lg border border-slate-800/80 bg-artemis-900/50 hover:bg-slate-800/50 transition-all flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-500" />
                {event.time}
              </span>
              <span
                className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded border ${event.tagColor}`}
              >
                {event.tag}
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-200">{event.title}</div>

            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="w-3 h-3 text-slate-500" />
              <span>{event.location}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
