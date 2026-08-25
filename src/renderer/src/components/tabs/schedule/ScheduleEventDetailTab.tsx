import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Car,
  User,
  ClipboardList,
  MapPin,
  FileText,
  Trash2,
  Edit2,
  Check,
  ExternalLink,
  X,
  Target,
} from 'lucide-react';
import { useSchedule } from '../../../state/ScheduleContext';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useHome } from '../../../state/HomeContext';
import { useTabs } from '../../../state/TabContext';
import type {
  ScheduleEventType,
  ScheduleEventStatus,
} from '@shared/scheduleTypes';
import clsx from 'clsx';

interface ScheduleEventDetailTabProps {
  eventId: string;
}

const TYPE_CONFIG: Record<
  ScheduleEventType,
  { label: string; bg: string; text: string; border: string }
> = {
  service: { label: 'Service / Repair', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  diagnostic: { label: 'Diagnostic', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  inspection: { label: 'Inspection', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  dropoff: { label: 'Vehicle Drop-off', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  pickup: { label: 'Vehicle Pick-up', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  parts: { label: 'Parts Arrival / Pickup', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  meeting: { label: 'Customer Meeting', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  admin: { label: 'Administrative', bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' },
  other: { label: 'Other Appointment', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
};

const STATUS_CONFIG: Record<
  ScheduleEventStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  scheduled: { label: 'Scheduled', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  confirmed: { label: 'Confirmed', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  in_progress: { label: 'In Progress', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  completed: { label: 'Completed', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  no_show: { label: 'No Show', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
};

export const ScheduleEventDetailTab: React.FC<ScheduleEventDetailTabProps> = ({ eventId }) => {
  const { getEventById, updateEvent, deleteEvent } = useSchedule();
  const { getCustomerById, getVehicleById, getWorkOrderById } = useAutomotive();
  const {
    openCustomerTab,
    openVehicleTab,
    openWorkOrderTab,
    syncScheduleEventTitle,
    closeTab,
    activeTabId,
  } = useTabs();
  const { setCurrentMission, clearCurrentMission, isCurrentMission } = useHome();

  const event = getEventById(eventId);
  const liveCustomer = event?.customerId ? getCustomerById(event.customerId) : undefined;
  const liveVehicle = event?.vehicleId ? getVehicleById(event.vehicleId) : undefined;
  const liveWorkOrder = event?.workOrderId ? getWorkOrderById(event.workOrderId) : undefined;

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(event?.title || '');
  const [type, setType] = useState<ScheduleEventType>(event?.type || 'service');
  const [status, setStatus] = useState<ScheduleEventStatus>(event?.status || 'scheduled');
  const [location, setLocation] = useState(event?.location || '');
  const [notes, setNotes] = useState(event?.notes || '');
  const [error, setError] = useState<string | null>(null);

  if (!event) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-artemis-950 text-slate-400 text-xs p-6 text-center">
        <Calendar className="w-8 h-8 text-slate-600 mb-2" />
        <h4 className="text-sm font-bold text-slate-200">Schedule Event Not Found</h4>
        <p className="text-slate-500 mt-1 max-w-sm">
          This event may have been deleted or does not exist.
        </p>
      </div>
    );
  }

  const handleStartEdit = () => {
    setTitle(event.title);
    setType(event.type);
    setStatus(event.status);
    setLocation(event.location || '');
    setNotes(event.notes || '');
    setError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!title.trim()) {
      setError('Event title cannot be empty');
      return;
    }

    try {
      const updated = await updateEvent(event.id, {
        title: title.trim(),
        type,
        status,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      syncScheduleEventTitle(event.id, updated.title);
      setIsEditing(false);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleStatusChange = async (newStatus: ScheduleEventStatus) => {
    try {
      await updateEvent(event.id, { status: newStatus });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to archive appointment ${event.eventNumber}?`)) {
      await deleteEvent(event.id);
      closeTab(activeTabId);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      timeZone: event.timeZone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeRange = (start: number, end: number, allDay: boolean) => {
    if (allDay) return 'All Day';
    const s = new Date(start).toLocaleTimeString([], { timeZone: event.timeZone, hour: 'numeric', minute: '2-digit' });
    const e = new Date(end).toLocaleTimeString([], { timeZone: event.timeZone, hour: 'numeric', minute: '2-digit' });
    return `${s} – ${e}`;
  };

  const durationMinutes = Math.round((event.endAt - event.startAt) / (1000 * 60));
  const formatDuration = (mins: number) => {
    if (event.allDay) {
      const hours = mins / 60;
      return hours === 24 ? 'All Day (24 hrs)' : `All Day (${hours} hrs DST)`;
    }
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h} hr ${m} min`;
    if (h > 0) return `${h} hr`;
    return `${m} min`;
  };

  const statusStyle = STATUS_CONFIG[event.status] || STATUS_CONFIG.scheduled;
  const typeStyle = TYPE_CONFIG[event.type] || TYPE_CONFIG.service;

  return (
    <div className="h-full w-full bg-artemis-950 flex flex-col overflow-hidden text-slate-100 select-none">
      {/* Top Header Bar */}
      <div className="h-14 bg-artemis-950 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 truncate">
                {event.title}
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                {event.eventNumber}
              </span>
              <span
                className={clsx(
                  'text-[10px] uppercase font-bold px-2 py-0.5 rounded border',
                  typeStyle.bg,
                  typeStyle.text,
                  typeStyle.border
                )}
              >
                {typeStyle.label}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 font-mono">
              <span>{formatDate(event.startAt)}</span>
              <span>•</span>
              <span className="text-slate-400">{formatTimeRange(event.startAt, event.endAt, event.allDay)}</span>
              <span>•</span>
              <span>{event.timeZone}</span>
            </div>
          </div>
        </div>

        {/* Status Dropdown & Actions */}
        <div className="flex items-center gap-3">
          {/* Current Mission Button */}
          {event.status !== 'completed' && event.status !== 'cancelled' && event.status !== 'no_show' && (
            <button
              type="button"
              onClick={async () => {
                if (isCurrentMission('schedule-event', event.id)) {
                  await clearCurrentMission();
                } else {
                  await setCurrentMission({ resourceType: 'schedule-event', resourceId: event.id });
                }
              }}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                isCurrentMission('schedule-event', event.id)
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              )}
            >
              <Target className={clsx('w-3.5 h-3.5', isCurrentMission('schedule-event', event.id) && 'text-amber-400 fill-amber-400/20')} />
              {isCurrentMission('schedule-event', event.id) ? '★ Current Mission' : 'Set as Current Mission'}
            </button>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Status:</span>
            <select
              value={event.status}
              onChange={(e) => handleStatusChange(e.target.value as ScheduleEventStatus)}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer focus:outline-none',
                statusStyle.bg,
                statusStyle.text,
                statusStyle.border
              )}
            >
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>

          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Details
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleDelete}
            title="Archive Appointment"
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl w-full mx-auto">
        {/* Date, Time & Duration Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              Scheduled Date
            </span>
            <span className="text-base font-bold text-slate-100 block">
              {formatDate(event.startAt)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              TZ: {event.timeZone}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Time Window
            </span>
            <span className="text-base font-bold text-cyan-400 block font-mono">
              {formatTimeRange(event.startAt, event.endAt, event.allDay)}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Duration: {formatDuration(durationMinutes)}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Location / Service Bay
            </span>
            {isEditing ? (
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location / Bay"
                className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs mt-1"
              />
            ) : (
              <span className="text-base font-semibold text-slate-200 block">
                {event.location || 'Shop Main Floor'}
              </span>
            )}
            <span className="text-[11px] text-slate-500 font-mono">
              Created: {new Date(event.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Linked Automotive Resources */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <ClipboardList className="w-3.5 h-3.5 text-artemis-accent" />
            Linked Automotive Resources
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Work Order Card */}
            <div className="p-3.5 rounded-xl bg-artemis-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
                Work Order
              </span>
              {liveWorkOrder ? (
                <div
                  onClick={() =>
                    openWorkOrderTab(
                      liveWorkOrder.id,
                      `${liveWorkOrder.workOrderNumber} — ${liveWorkOrder.vehicleDescriptionSnapshot}`
                    )
                  }
                  className="p-2.5 rounded-lg bg-artemis-900 border border-slate-800 hover:border-emerald-500/40 cursor-pointer group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-400 group-hover:underline font-mono">
                      {liveWorkOrder.workOrderNumber}
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 truncate">
                    {liveWorkOrder.vehicleDescriptionSnapshot}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono uppercase">
                    Status: {liveWorkOrder.status}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 text-slate-500 text-xs italic bg-artemis-900/40 rounded-lg">
                  No linked Work Order.
                </div>
              )}
            </div>

            {/* Vehicle Card */}
            <div className="p-3.5 rounded-xl bg-artemis-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-indigo-400" />
                Vehicle
              </span>
              {liveVehicle ? (
                <div
                  onClick={() =>
                    openVehicleTab(
                      liveVehicle.id,
                      `${liveVehicle.year ? `${liveVehicle.year} ` : ''}${liveVehicle.make} ${liveVehicle.model}`
                    )
                  }
                  className="p-2.5 rounded-lg bg-artemis-900 border border-slate-800 hover:border-indigo-500/40 cursor-pointer group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-100 group-hover:text-artemis-accent transition-colors">
                      {liveVehicle.year ? `${liveVehicle.year} ` : ''}{liveVehicle.make} {liveVehicle.model}
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-artemis-accent transition-colors" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {liveVehicle.vehicleNumber} {liveVehicle.licensePlate ? `• [${liveVehicle.licensePlate}]` : ''}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 text-slate-500 text-xs italic bg-artemis-900/40 rounded-lg">
                  No linked Vehicle.
                </div>
              )}
            </div>

            {/* Customer Card */}
            <div className="p-3.5 rounded-xl bg-artemis-950/80 border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                Customer
              </span>
              {liveCustomer ? (
                <div
                  onClick={() => openCustomerTab(liveCustomer.id, liveCustomer.name)}
                  className="p-2.5 rounded-lg bg-artemis-900 border border-slate-800 hover:border-cyan-500/40 cursor-pointer group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-100 group-hover:text-cyan-400 transition-colors">
                      {liveCustomer.name}
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {liveCustomer.customerNumber} {liveCustomer.phone ? `• ${liveCustomer.phone}` : ''}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 text-slate-500 text-xs italic bg-artemis-900/40 rounded-lg">
                  No linked Customer account.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Appointment Notes */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-artemis-accent" />
            Appointment Details & Instructions
          </h3>

          {isEditing ? (
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter instructions, customer requests, or technician notes..."
              className="w-full bg-artemis-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 resize-none focus:outline-none"
            />
          ) : (
            <p className="text-xs text-slate-200 leading-relaxed font-medium bg-artemis-950/40 p-3.5 rounded-lg border border-slate-800/80">
              {event.notes || 'No appointment notes recorded.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
