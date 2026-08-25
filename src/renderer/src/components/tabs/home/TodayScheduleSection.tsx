import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  ArrowUpRight,
  Plus,
  Car,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';
import { useSchedule } from '../../../state/ScheduleContext';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useTabs } from '../../../state/TabContext';
import { CreateEventModal } from '../schedule/CreateEventModal';
import { formatTimeInZone } from '@shared/scheduleUtils';
import type { CreateScheduleEventOptions } from '@shared/scheduleTypes';
import clsx from 'clsx';

const TYPE_PILL_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  service: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  diagnostic: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  inspection: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  dropoff: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  pickup: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  parts: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  meeting: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  admin: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  other: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
};

export const TodayScheduleSection: React.FC = () => {
  const { todayEvents, error, createEvent } = useSchedule();
  const { getVehicleById, getWorkOrderById } = useAutomotive();
  const { openScheduleTab, openScheduleEventTab } = useTabs();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Chronologically sort today's events by startAt
  const sortedEvents = [...todayEvents].sort((a, b) => a.startAt - b.startAt);

  const handleCreateEvent = async (options: CreateScheduleEventOptions) => {
    await createEvent(options);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="bg-artemis-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              Today's Schedule
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              {sortedEvents.length} {sortedEvents.length === 1 ? 'appointment' : 'appointments'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Schedule New Appointment"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openScheduleTab()}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-rose-500/10"
          >
            <span>Open Calendar</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="my-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to load schedule: {error}</span>
        </div>
      )}

      {/* Body / List */}
      <div className="mt-3 space-y-2 flex-1 overflow-y-auto min-h-[160px] pr-1">
        {sortedEvents.length === 0 ? (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-slate-800">
            <Clock className="w-6 h-6 text-slate-600 mb-1.5" />
            <div className="text-xs font-semibold text-slate-400">Nothing scheduled today</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Service appointments and timeline events for today will appear here.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Event
            </button>
          </div>
        ) : (
          sortedEvents.map((event) => {
            const pill = TYPE_PILL_CONFIG[event.type] || TYPE_PILL_CONFIG.service;
            const timeLabel = event.allDay
              ? 'All Day'
              : `${formatTimeInZone(event.startAt, event.timeZone)} – ${formatTimeInZone(event.endAt, event.timeZone)}`;

            const linkedVehicle = event.vehicleId ? getVehicleById(event.vehicleId) : undefined;
            const linkedWO = event.workOrderId ? getWorkOrderById(event.workOrderId) : undefined;

            return (
              <div
                key={event.id}
                onClick={() => openScheduleEventTab(event.id, event.title)}
                className="group p-3 rounded-xl bg-artemis-950/60 hover:bg-artemis-950 border border-slate-800/80 hover:border-rose-500/30 transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono font-bold text-rose-400">
                      {timeLabel}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">•</span>
                    <span
                      className={clsx(
                        'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border',
                        pill.bg,
                        pill.text,
                        pill.border
                      )}
                    >
                      {event.type}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {event.eventNumber}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-rose-300 transition-colors truncate">
                    {event.title}
                  </h4>

                  {(linkedVehicle || linkedWO) && (
                    <div className="mt-1 flex items-center gap-3 text-[10px] font-mono text-slate-400">
                      {linkedVehicle && (
                        <span className="flex items-center gap-1 truncate">
                          <Car className="w-3 h-3 text-slate-500" />
                          {linkedVehicle.year ? `${linkedVehicle.year} ` : ''}{linkedVehicle.make} {linkedVehicle.model}
                        </span>
                      )}
                      {linkedWO && (
                        <span className="flex items-center gap-1 text-amber-400">
                          <ClipboardList className="w-3 h-3" />
                          {linkedWO.workOrderNumber}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-rose-400 transition-colors shrink-0" />
              </div>
            );
          })
        )}
      </div>

      {/* Reusable Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEvent}
      />
    </div>
  );
};
