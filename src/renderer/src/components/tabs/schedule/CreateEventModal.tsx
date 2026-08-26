import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  X,
  Check,
  AlertTriangle,
  Clock,
  Car,
  User,
  ClipboardList,
  MapPin,
  FileText,
} from 'lucide-react';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useSchedule } from '../../../state/ScheduleContext';
import type {
  ScheduleEventType,
  ScheduleEventStatus,
  CreateScheduleEventOptions,
  OverlapConflictInfo,
} from '@shared/scheduleTypes';
import {
  localDateTimeToUtc,
  getAllDayBounds,
} from '@shared/scheduleUtils';
import clsx from 'clsx';

interface CreateEventModalProps {
  isOpen: boolean;
  initialWorkOrderId?: string;
  initialVehicleId?: string;
  initialCustomerId?: string;
  initialTitle?: string;
  initialDate?: string; // YYYY-MM-DD
  initialStartTime?: string; // HH:MM
  initialEndTime?: string; // HH:MM
  onClose: () => void;
  onSubmit: (options: CreateScheduleEventOptions) => Promise<void>;
}

const EVENT_TYPES: { value: ScheduleEventType; label: string }[] = [
  { value: 'service', label: 'Service / Repair' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'dropoff', label: 'Vehicle Drop-off' },
  { value: 'pickup', label: 'Vehicle Pick-up' },
  { value: 'parts', label: 'Parts Arrival / Pickup' },
  { value: 'meeting', label: 'Customer Meeting' },
  { value: 'admin', label: 'Administrative' },
  { value: 'other', label: 'Other Appointment' },
];

const EVENT_STATUSES: { value: ScheduleEventStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
];

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getDefaultDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  initialWorkOrderId,
  initialVehicleId,
  initialCustomerId,
  initialTitle,
  initialDate,
  initialStartTime = '09:00',
  initialEndTime = '10:00',
  onClose,
  onSubmit,
}) => {
  const { customers, vehicles, workOrders, getWorkOrderById, getVehicleById } = useAutomotive();
  const { checkOverlap } = useSchedule();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<ScheduleEventType>('service');
  const [status, setStatus] = useState<ScheduleEventStatus>('scheduled');
  const [date, setDate] = useState(initialDate || getDefaultDateString());
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [allDay, setAllDay] = useState(false);
  const [timeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );

  const [workOrderId, setWorkOrderId] = useState<string>(initialWorkOrderId || '');
  const [vehicleId, setVehicleId] = useState<string>(initialVehicleId || '');
  const [customerId, setCustomerId] = useState<string>(initialCustomerId || '');

  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const [overlapInfo, setOverlapInfo] = useState<OverlapConflictInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset state when opened
  useEffect(() => {
    if (isOpen) {
      const activeWO = initialWorkOrderId ? getWorkOrderById(initialWorkOrderId) : undefined;
      const activeVeh = initialVehicleId
        ? getVehicleById(initialVehicleId)
        : activeWO
        ? getVehicleById(activeWO.vehicleId)
        : undefined;

      const targetTitle =
        initialTitle ||
        (activeWO
          ? `Service: ${activeWO.workOrderNumber} — ${activeWO.vehicleDescriptionSnapshot}`
          : activeVeh
          ? `Appointment: ${activeVeh.year ? `${activeVeh.year} ` : ''}${activeVeh.make} ${activeVeh.model}`
          : '');

      setTitle(targetTitle);
      setDate(initialDate || getDefaultDateString());
      setStartTime(initialStartTime);
      setEndTime(initialEndTime);
      setWorkOrderId(initialWorkOrderId || '');
      setVehicleId(initialVehicleId || (activeWO ? activeWO.vehicleId : ''));
      setCustomerId(
        initialCustomerId ||
          (activeWO ? activeWO.customerId || '' : activeVeh ? activeVeh.customerId || '' : '')
      );
      setError(null);
    }
  }, [
    isOpen,
    initialWorkOrderId,
    initialVehicleId,
    initialCustomerId,
    initialTitle,
    initialDate,
    initialStartTime,
    initialEndTime,
    getWorkOrderById,
    getVehicleById,
  ]);

  // Handle Work Order selection change -> auto-suggest linked Vehicle and Customer
  const handleWorkOrderChange = (newWOId: string) => {
    setWorkOrderId(newWOId);
    if (newWOId) {
      const wo = getWorkOrderById(newWOId);
      if (wo) {
        setVehicleId(wo.vehicleId);
        setCustomerId(wo.customerId || '');
        if (!title.trim() || title.startsWith('Service:') || title.startsWith('Appointment:')) {
          setTitle(`Service: ${wo.workOrderNumber} — ${wo.vehicleDescriptionSnapshot}`);
        }
      }
    }
  };

  // Handle Vehicle selection change -> auto-suggest customer if no WO selected
  const handleVehicleChange = (newVehId: string) => {
    setVehicleId(newVehId);
    if (newVehId && !workOrderId) {
      const veh = getVehicleById(newVehId);
      if (veh && veh.customerId) {
        setCustomerId(veh.customerId);
      }
      if (!title.trim() || title.startsWith('Appointment:')) {
        setTitle(
          `Appointment: ${veh ? `${veh.year ? `${veh.year} ` : ''}${veh.make} ${veh.model}` : ''}`
        );
      }
    }
  };

  // Calculate DST-safe startAt and endAt timestamps in ms
  const { startAt, endAt, timeRangeValid } = useMemo(() => {
    if (!date) return { startAt: 0, endAt: 0, timeRangeValid: false };

    try {
      if (allDay) {
        const { startAt, endAt } = getAllDayBounds(date, date, timeZone);
        return { startAt, endAt, timeRangeValid: !isNaN(startAt) && endAt > startAt };
      } else {
        const start = localDateTimeToUtc(date, startTime, timeZone);
        const end = localDateTimeToUtc(date, endTime, timeZone);
        return { startAt: start, endAt: end, timeRangeValid: !isNaN(start) && !isNaN(end) && end > start };
      }
    } catch {
      return { startAt: 0, endAt: 0, timeRangeValid: false };
    }
  }, [date, startTime, endTime, allDay, timeZone]);

  // Live conflict detection (non-blocking)
  useEffect(() => {
    if (!isOpen || !timeRangeValid || startAt <= 0 || endAt <= startAt) {
      setOverlapInfo(null);
      return;
    }

    let isMounted = true;
    checkOverlap(startAt, endAt)
      .then((info) => {
        if (isMounted) setOverlapInfo(info);
      })
      .catch(() => {
        if (isMounted) setOverlapInfo(null);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, startAt, endAt, timeRangeValid, checkOverlap]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Event title is required');
      return;
    }

    if (!timeRangeValid || endAt <= startAt) {
      setError('End time must be after start time');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim(),
        type,
        status,
        startAt,
        endAt,
        allDay,
        timeZone,
        workOrderId: workOrderId ? workOrderId : null,
        vehicleId: vehicleId ? vehicleId : null,
        customerId: customerId ? customerId : null,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="w-full max-w-xl bg-artemis-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
            <Calendar className="w-4 h-4 text-rose-400" />
            Schedule New Appointment
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Live Non-Blocking Conflict Warning */}
        {overlapInfo && overlapInfo.hasConflict && (
          <div className="mt-3 p-3 rounded-xl bg-bronze-500/10 border border-bronze-500/30 text-bronze-300 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-bronze-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Scheduling Conflict Detected</span>
            </div>
            <p className="text-[11px] text-bronze-200/90 leading-relaxed">
              This appointment overlaps with {overlapInfo.conflicts.length} scheduled event(s):
            </p>
            <ul className="list-disc list-inside text-[11px] font-mono text-bronze-300/80 pl-1 space-y-0.5">
              {overlapInfo.conflicts.map((c) => (
                <li key={c.id}>
                  {c.eventNumber} — "{c.title}" ({formatTime(c.startAt)} - {formatTime(c.endAt)})
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-bronze-400/70 italic pt-0.5">
              (Non-blocking: You may still save this appointment).
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {/* Title */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Event Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Brake Service Intake & Diagnosis"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-artemis-accent"
            />
          </div>

          {/* Type & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Event Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ScheduleEventType)}
                className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-artemis-accent"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ScheduleEventStatus)}
                className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-artemis-accent"
              >
                {EVENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time Settings */}
          <div className="p-3.5 rounded-xl bg-artemis-950/80 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                Date & Time
              </span>
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="rounded border-zinc-700 bg-artemis-900 text-artemis-accent focus:ring-0"
                />
                All-Day Event
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-zinc-500 block mb-0.5">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-artemis-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none"
                />
              </div>

              {!allDay && (
                <>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-0.5">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-artemis-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-0.5">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-artemis-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs font-mono focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between pt-1">
              <span>Timezone: {timeZone}</span>
              {allDay && <span className="text-silver-400">Spans local midnight to midnight</span>}
            </div>
          </div>

          {/* Automotive Relationship Linkers */}
          <div className="p-3.5 rounded-xl bg-artemis-950/80 border border-zinc-800 space-y-2.5">
            <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-bronze-400" />
              Automotive Resource Links (Optional)
            </span>

            {/* Work Order Link */}
            <div>
              <label className="text-[10px] text-zinc-500 block mb-0.5">Linked Work Order</label>
              <select
                value={workOrderId}
                onChange={(e) => handleWorkOrderChange(e.target.value)}
                className="w-full bg-artemis-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-100 text-xs focus:outline-none"
              >
                <option value="">— None / Standalone Appointment —</option>
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.workOrderNumber} • {wo.vehicleDescriptionSnapshot} ({wo.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Vehicle Link */}
              <div>
                <label className="text-[10px] text-zinc-500 block mb-0.5 flex items-center gap-1">
                  <Car className="w-3 h-3 text-silver-400" />
                  Vehicle
                </label>
                <select
                  value={vehicleId}
                  disabled={!!workOrderId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className={clsx(
                    'w-full bg-artemis-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-100 text-xs focus:outline-none',
                    workOrderId && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  <option value="">— None —</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber} • {v.year ? `${v.year} ` : ''}{v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Link */}
              <div>
                <label className="text-[10px] text-zinc-500 block mb-0.5 flex items-center gap-1">
                  <User className="w-3 h-3 text-silver-400" />
                  Customer
                </label>
                <select
                  value={customerId}
                  disabled={!!workOrderId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className={clsx(
                    'w-full bg-artemis-900 border border-zinc-700 rounded-lg px-2 py-1.5 text-zinc-100 text-xs focus:outline-none',
                    workOrderId && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  <option value="">— None —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerNumber} • {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-zinc-500" />
              Location / Service Bay
            </label>
            <input
              type="text"
              placeholder="e.g. Bay 2 / Main Lift, Customer Shop, or Parts Counter"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-zinc-100 placeholder-zinc-500 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-zinc-500" />
              Appointment Notes
            </label>
            <textarea
              rows={2}
              placeholder="Special instructions, parts ready, customer waiting..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-artemis-950 border border-zinc-700 rounded-xl p-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !timeRangeValid}
              className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-zinc-950 text-xs font-bold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? 'Scheduling…' : 'Schedule Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
