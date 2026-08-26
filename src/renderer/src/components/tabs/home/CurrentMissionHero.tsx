import React from 'react';
import {
  Target,
  ArrowRight,
  X,
  Calendar,
  FileText,
  Clock,
  Car,
  AlertTriangle,
} from 'lucide-react';
import { useHome } from '../../../state/HomeContext';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useSchedule } from '../../../state/ScheduleContext';
import { useLibrary } from '../../../state/LibraryContext';
import { useTabs } from '../../../state/TabContext';
import { formatDateInZone, formatTimeInZone } from '@shared/scheduleUtils';
import clsx from 'clsx';

const WO_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  open: { label: 'Open', bg: 'bg-silver-500/10', text: 'text-silver-400', border: 'border-silver-500/30' },
  diagnosing: { label: 'Diagnosing', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  awaiting_approval: { label: 'Awaiting Approval', bg: 'bg-bronze-500/10', text: 'text-bronze-400', border: 'border-bronze-500/30' },
  waiting_parts: { label: 'Waiting on Parts', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  in_progress: { label: 'In Progress', bg: 'bg-bronze-500/10', text: 'text-bronze-400', border: 'border-bronze-500/30' },
  completed: { label: 'Completed', bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  draft: { label: 'Draft', bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' },
};

export const CurrentMissionHero: React.FC = () => {
  const { currentMission, clearCurrentMission } = useHome();
  const { getWorkOrderById } = useAutomotive();
  const { getEventById } = useSchedule();
  const { items } = useLibrary();
  const { openWorkOrderTab, openScheduleEventTab, openDocumentTab } = useTabs();

  if (!currentMission) {
    return (
      <div className="bg-gradient-to-br from-artemis-900 to-artemis-950 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bronze-500/10 border border-bronze-500/20 text-bronze-400 flex items-center justify-center shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-bronze-400">
                  Current Mission
                </span>
                <span className="text-[10px] text-zinc-500 font-medium px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                  Unassigned
                </span>
              </div>
              <h2 className="text-base font-bold text-zinc-200 mt-0.5">
                No active mission set
              </h2>
            </div>
          </div>
          <p className="text-xs text-zinc-400 max-w-md hidden md:block text-right">
            Open any Work Order, appointment, or document and click <strong className="text-bronze-300">Set as Current Mission</strong> to lock your cockpit focus.
          </p>
        </div>
      </div>
    );
  }

  // 1. Work Order Mission
  if (currentMission.resourceType === 'work-order') {
    const workOrder = getWorkOrderById(currentMission.resourceId);
    const isArchived = !workOrder || workOrder.isDeleted;

    if (isArchived) {
      return (
        <div className="bg-artemis-900 border border-bronze-500/30 rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bronze-500/10 border border-bronze-500/20 text-bronze-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-bronze-400">
                Current Mission · Work Order
              </div>
              <h2 className="text-sm font-bold text-zinc-200 mt-0.5">
                Referenced Work Order is archived or deleted
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => clearCurrentMission()}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 border border-zinc-700 transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Clear Mission
          </button>
        </div>
      );
    }

    const statusStyle = WO_STATUS_CONFIG[workOrder.status] || WO_STATUS_CONFIG.open;

    return (
      <div className="bg-gradient-to-br from-artemis-900 via-artemis-900 to-artemis-950 border border-bronze-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-bronze-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-bronze-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Current Mission
              </span>
              <span className="text-[11px] font-mono text-zinc-500">•</span>
              <span className="text-[11px] font-mono font-bold text-zinc-400">
                {workOrder.workOrderNumber}
              </span>
              <span
                className={clsx(
                  'text-[10px] font-bold uppercase px-2 py-0.5 rounded border',
                  statusStyle.bg,
                  statusStyle.text,
                  statusStyle.border
                )}
              >
                {statusStyle.label}
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight truncate flex items-center gap-2">
              <Car className="w-5 h-5 text-zinc-400 shrink-0" />
              <span>{workOrder.vehicleDescriptionSnapshot}</span>
            </h2>

            {workOrder.customerConcern && (
              <div className="mt-2.5 text-xs text-zinc-300 bg-artemis-950/60 border border-zinc-800 rounded-xl px-3.5 py-2 max-w-3xl line-clamp-2">
                <span className="text-zinc-500 font-medium mr-1.5 font-mono uppercase text-[10px]">Concern:</span>
                {workOrder.customerConcern}
              </div>
            )}

            <div className="mt-3 flex items-center gap-4 text-xs font-mono text-zinc-400">
              {workOrder.customerNameSnapshot && (
                <span>Customer: <strong className="text-zinc-200">{workOrder.customerNameSnapshot}</strong></span>
              )}
              <span>Opened: {new Date(workOrder.openedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openWorkOrderTab(workOrder.id, workOrder.workOrderNumber)}
              className="px-4 py-2.5 rounded-xl bg-bronze-500 hover:bg-bronze-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-bronze-500/20 transition-all cursor-pointer"
            >
              <span>Open Work Order</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => clearCurrentMission()}
              title="Clear Current Mission"
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Schedule Event Mission
  if (currentMission.resourceType === 'schedule-event') {
    const event = getEventById(currentMission.resourceId);
    const isArchived = !event || event.isDeleted;

    if (isArchived) {
      return (
        <div className="bg-artemis-900 border border-bronze-500/30 rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bronze-500/10 border border-bronze-500/20 text-bronze-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-bronze-400">
                Current Mission · Schedule Event
              </div>
              <h2 className="text-sm font-bold text-zinc-200 mt-0.5">
                Referenced Appointment is archived or deleted
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => clearCurrentMission()}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 border border-zinc-700 transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Clear Mission
          </button>
        </div>
      );
    }

    const timeString = event.allDay
      ? 'All Day'
      : `${formatTimeInZone(event.startAt, event.timeZone)} – ${formatTimeInZone(event.endAt, event.timeZone)}`;
    const dateString = formatDateInZone(event.startAt, event.timeZone);

    return (
      <div className="bg-gradient-to-br from-artemis-900 via-artemis-900 to-artemis-950 border border-bronze-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-bronze-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-bronze-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Current Mission
              </span>
              <span className="text-[11px] font-mono text-zinc-500">•</span>
              <span className="text-[11px] font-mono font-bold text-zinc-400">
                {event.eventNumber}
              </span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                {event.type}
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight truncate flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{event.title}</span>
            </h2>

            <div className="mt-2.5 flex items-center gap-3 text-xs text-zinc-300 font-mono">
              <span className="flex items-center gap-1 text-zinc-200">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {dateString} • {timeString}
              </span>
              <span>({event.timeZone})</span>
            </div>

            {event.notes && (
              <div className="mt-2.5 text-xs text-zinc-300 bg-artemis-950/60 border border-zinc-800 rounded-xl px-3.5 py-2 max-w-3xl line-clamp-2">
                <span className="text-zinc-500 font-medium mr-1.5 font-mono uppercase text-[10px]">Notes:</span>
                {event.notes}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openScheduleEventTab(event.id, event.title)}
              className="px-4 py-2.5 rounded-xl bg-bronze-500 hover:bg-bronze-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-bronze-500/20 transition-all cursor-pointer"
            >
              <span>Open Appointment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => clearCurrentMission()}
              title="Clear Current Mission"
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Document Mission
  if (currentMission.resourceType === 'document') {
    const doc = items.find((i) => i.id === currentMission.resourceId);
    const isArchived = !doc || doc.isDeleted;

    if (isArchived) {
      return (
        <div className="bg-artemis-900 border border-bronze-500/30 rounded-2xl p-6 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-bronze-500/10 border border-bronze-500/20 text-bronze-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-bronze-400">
                Current Mission · Document
              </div>
              <h2 className="text-sm font-bold text-zinc-200 mt-0.5">
                Referenced Document is archived or deleted
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => clearCurrentMission()}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 border border-zinc-700 transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Clear Mission
          </button>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-artemis-900 via-artemis-900 to-artemis-950 border border-bronze-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-bronze-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-bronze-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Current Mission
              </span>
              <span className="text-[11px] font-mono text-zinc-500">•</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-silver-500/10 text-silver-400 border border-silver-500/30">
                Artemis Document
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-zinc-100 tracking-tight truncate flex items-center gap-2">
              <FileText className="w-5 h-5 text-silver-400 shrink-0" />
              <span>{doc.name}</span>
            </h2>

            <div className="mt-2 flex items-center gap-4 text-xs font-mono text-zinc-400">
              <span>Updated: {new Date(doc.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openDocumentTab(doc.id, doc.name)}
              className="px-4 py-2.5 rounded-xl bg-bronze-500 hover:bg-bronze-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-bronze-500/20 transition-all cursor-pointer"
            >
              <span>Open Document</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => clearCurrentMission()}
              title="Clear Current Mission"
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
