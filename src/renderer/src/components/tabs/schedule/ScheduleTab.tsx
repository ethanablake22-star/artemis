import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Clock,
  Car,
  User,
  ClipboardList,
  MapPin,
} from 'lucide-react';
import { useSchedule } from '../../../state/ScheduleContext';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useTabs } from '../../../state/TabContext';
import { CreateEventModal } from './CreateEventModal';
import type {
  ScheduleEventRecord,
  ScheduleEventType,
  ScheduleEventStatus,
} from '@shared/scheduleTypes';
import { getAllDayBounds } from '@shared/scheduleUtils';
import clsx from 'clsx';

type CalendarViewMode = 'today' | 'week' | 'month';

const TYPE_CONFIG: Record<
  ScheduleEventType,
  { label: string; bg: string; text: string; border: string }
> = {
  service: { label: 'Service', bg: 'bg-bronze-500/15', text: 'text-bronze-400', border: 'border-bronze-500/30' },
  diagnostic: { label: 'Diagnostic', bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  inspection: { label: 'Inspection', bg: 'bg-silver-500/15', text: 'text-silver-400', border: 'border-silver-500/30' },
  dropoff: { label: 'Drop-off', bg: 'bg-bronze-500/15', text: 'text-bronze-400', border: 'border-bronze-500/30' },
  pickup: { label: 'Pick-up', bg: 'bg-silver-500/15', text: 'text-silver-400', border: 'border-silver-500/30' },
  parts: { label: 'Parts', bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  meeting: { label: 'Meeting', bg: 'bg-silver-500/15', text: 'text-silver-400', border: 'border-silver-500/30' },
  admin: { label: 'Admin', bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' },
  other: { label: 'Other', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
};

const STATUS_BADGES: Record<
  ScheduleEventStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  scheduled: { label: 'Scheduled', bg: 'bg-silver-500/10', text: 'text-silver-400', border: 'border-silver-500/20' },
  confirmed: { label: 'Confirmed', bg: 'bg-silver-500/10', text: 'text-silver-400', border: 'border-silver-500/20' },
  in_progress: { label: 'In Progress', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  completed: { label: 'Completed', bg: 'bg-bronze-500/10', text: 'text-bronze-400', border: 'border-bronze-500/20' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  no_show: { label: 'No Show', bg: 'bg-bronze-500/10', text: 'text-bronze-400', border: 'border-bronze-500/20' },
};

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const ScheduleTab: React.FC = () => {
  const { events, createEvent } = useSchedule();
  const { getCustomerById, getVehicleById, getWorkOrderById } = useAutomotive();
  const { openScheduleEventTab } = useTabs();

  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<string | undefined>(undefined);

  // Date Navigation handlers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'today') d.setDate(d.getDate() - 1);
      else if (viewMode === 'week') d.setDate(d.getDate() - 7);
      else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'today') d.setDate(d.getDate() + 1);
      else if (viewMode === 'week') d.setDate(d.getDate() + 7);
      else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Header Title based on view mode
  const headerTitle = useMemo(() => {
    if (viewMode === 'today') {
      return currentDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    if (viewMode === 'week') {
      const curr = new Date(currentDate);
      const day = curr.getDay(); // 0 is Sunday
      const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(curr.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      if (monday.getMonth() === sunday.getMonth()) {
        return `${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString(undefined, { day: 'numeric', year: 'numeric' })}`;
      }
      return `${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }

    // Month view
    return currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [viewMode, currentDate]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (e.isDeleted) return false;
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          e.title.toLowerCase().includes(q) ||
          e.eventNumber.toLowerCase().includes(q) ||
          (e.location && e.location.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [events, typeFilter, searchQuery]);

  // Handle Event Click -> opens universal event tab
  const handleOpenEvent = (event: ScheduleEventRecord) => {
    openScheduleEventTab(event.id, `${event.eventNumber} — ${event.title}`);
  };

  // Calculate Week Days
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const day = curr.getDay();
    const diffToMonday = curr.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(curr.setDate(diffToMonday));

    const days: { date: Date; dateString: string; isToday: boolean }[] = [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        date: d,
        dateString,
        isToday: dateString === todayStr,
      });
    }
    return days;
  }, [currentDate]);

  // Calculate Month Grid Days
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday-based indexing: Mon=0 ... Sun=6
    let startingDay = firstDayOfMonth.getDay() - 1;
    if (startingDay < 0) startingDay = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    const grid: { date: Date; dateString: string; isCurrentMonth: boolean; isToday: boolean }[] = [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Leading days from prev month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      grid.push({ date: d, dateString, isCurrentMonth: false, isToday: dateString === todayStr });
    }

    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      grid.push({ date: d, dateString, isCurrentMonth: true, isToday: dateString === todayStr });
    }

    // Trailing days to fill 35 or 42 grid cells
    const remaining = 35 - grid.length > 0 ? 35 - grid.length : 42 - grid.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      grid.push({ date: d, dateString, isCurrentMonth: false, isToday: dateString === todayStr });
    }

    return grid;
  }, [currentDate]);

  // Quick event filter for a single date (DST-safe interval overlap)
  const getEventsForDate = (dateString: string) => {
    const { startAt: dayStart, endAt: dayEnd } = getAllDayBounds(dateString, dateString);
    return filteredEvents.filter((e) => e.startAt < dayEnd && e.endAt > dayStart);
  };

  const currentDateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const todayEventsList = getEventsForDate(currentDateString);

  return (
    <div className="h-full w-full bg-artemis-950 flex flex-col overflow-hidden text-zinc-100 select-none">
      {/* Top Header Bar */}
      <div className="h-14 bg-artemis-950 border-b border-zinc-800 px-6 flex items-center justify-between shrink-0">
        {/* Left: Subsystem branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              Schedule & Dispatch
            </h1>
            <p className="text-[11px] text-zinc-500 font-mono">
              Business Timeline & Service Appointments
            </p>
          </div>
        </div>

        {/* Center: Date Navigation & Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-artemis-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handlePrev}
              title="Previous"
              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-0.5 text-xs font-bold text-zinc-300 hover:text-zinc-100 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNext}
              title="Next"
              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs font-bold text-zinc-200 min-w-[180px] text-center font-mono">
            {headerTitle}
          </span>
        </div>

        {/* Right: View Toggles & New Event Button */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-artemis-900 rounded-xl border border-zinc-800">
            {(['today', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={clsx(
                  'px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors',
                  viewMode === mode
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setModalInitialDate(currentDateString);
              setIsCreateModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Event
          </button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="px-6 py-2.5 bg-artemis-950 border-b border-zinc-800/80 flex items-center justify-between gap-4 shrink-0">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-0.5">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={clsx(
              'px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors',
              typeFilter === 'all'
                ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            All Types ({events.length})
          </button>
          {[
            { key: 'service', label: 'Service' },
            { key: 'diagnostic', label: 'Diagnostic' },
            { key: 'inspection', label: 'Inspection' },
            { key: 'dropoff', label: 'Drop-off' },
            { key: 'pickup', label: 'Pick-up' },
            { key: 'parts', label: 'Parts' },
            { key: 'meeting', label: 'Meeting' },
          ].map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setTypeFilter(pill.key)}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors',
                typeFilter === pill.key
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -tranzinc-y-1/2" />
          <input
            type="text"
            placeholder="Search appointments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-artemis-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500/50"
          />
        </div>
      </div>

      {/* Main Calendar View Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* VIEW 1: TODAY VIEW */}
        {viewMode === 'today' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-400" />
                Schedule for {headerTitle} ({todayEventsList.length})
              </h2>
            </div>

            {todayEventsList.length === 0 ? (
              <div className="p-12 rounded-2xl border border-dashed border-zinc-800 bg-artemis-900/30 text-center flex flex-col items-center justify-center">
                <CalendarIcon className="w-10 h-10 text-zinc-600 mb-2" />
                <h3 className="text-sm font-bold text-zinc-300">No Appointments Scheduled</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  There are no active service operations or appointments booked for this day.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setModalInitialDate(currentDateString);
                    setIsCreateModalOpen(true);
                  }}
                  className="mt-4 px-4 py-1.5 rounded-xl bg-rose-500 text-zinc-950 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-400"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Book Appointment
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {todayEventsList.map((event) => {
                  const typeCfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.service;
                  const statusCfg = STATUS_BADGES[event.status] || STATUS_BADGES.scheduled;
                  const customer = event.customerId ? getCustomerById(event.customerId) : undefined;
                  const vehicle = event.vehicleId ? getVehicleById(event.vehicleId) : undefined;
                  const wo = event.workOrderId ? getWorkOrderById(event.workOrderId) : undefined;

                  return (
                    <div
                      key={event.id}
                      onClick={() => handleOpenEvent(event)}
                      className="p-4 rounded-xl bg-artemis-900 border border-zinc-800 hover:border-rose-500/40 cursor-pointer transition-all hover:shadow-lg group flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Time box */}
                        <div className="p-2.5 rounded-xl bg-artemis-950 border border-zinc-800 text-center shrink-0 min-w-[84px]">
                          {event.allDay ? (
                            <span className="text-[11px] font-bold text-silver-400 block font-mono">
                              ALL DAY
                            </span>
                          ) : (
                            <>
                              <span className="text-xs font-bold text-zinc-100 block font-mono">
                                {formatTime(event.startAt)}
                              </span>
                              <span className="text-[10px] text-zinc-500 block font-mono">
                                {formatTime(event.endAt)}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-rose-400">
                              {event.eventNumber}
                            </span>
                            <span
                              className={clsx(
                                'text-[10px] uppercase font-bold px-1.5 py-0.2 rounded border',
                                typeCfg.bg,
                                typeCfg.text,
                                typeCfg.border
                              )}
                            >
                              {typeCfg.label}
                            </span>
                            <span
                              className={clsx(
                                'text-[10px] font-bold px-1.5 py-0.2 rounded border',
                                statusCfg.bg,
                                statusCfg.text,
                                statusCfg.border
                              )}
                            >
                              {statusCfg.label}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-zinc-100 group-hover:text-rose-400 transition-colors mt-1">
                            {event.title}
                          </h4>

                          {/* Related badges */}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-zinc-400">
                            {wo && (
                              <span className="flex items-center gap-1 font-mono text-bronze-400">
                                <ClipboardList className="w-3 h-3" />
                                {wo.workOrderNumber}
                              </span>
                            )}
                            {vehicle && (
                              <span className="flex items-center gap-1 text-zinc-300">
                                <Car className="w-3 h-3 text-silver-400" />
                                {vehicle.year ? `${vehicle.year} ` : ''}{vehicle.make} {vehicle.model}
                              </span>
                            )}
                            {customer && (
                              <span className="flex items-center gap-1 text-zinc-300">
                                <User className="w-3 h-3 text-silver-400" />
                                {customer.name}
                              </span>
                            )}
                            {event.location && (
                              <span className="flex items-center gap-1 text-zinc-500">
                                <MapPin className="w-3 h-3 text-zinc-500" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-zinc-500 font-semibold group-hover:text-rose-400 shrink-0">
                        Open Tab →
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: WEEK VIEW */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-7 gap-3 h-full min-h-[550px]">
            {weekDays.map((day) => {
              const dayEvents = getEventsForDate(day.dateString);
              return (
                <div
                  key={day.dateString}
                  className={clsx(
                    'flex flex-col rounded-xl border p-3 bg-artemis-900/60 transition-colors',
                    day.isToday
                      ? 'border-rose-500/40 bg-artemis-900/90 shadow-md shadow-rose-950/20'
                      : 'border-zinc-800'
                  )}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 mb-2">
                    <div>
                      <span className="text-[11px] uppercase font-bold text-zinc-400 block">
                        {day.date.toLocaleDateString(undefined, { weekday: 'short' })}
                      </span>
                      <span
                        className={clsx(
                          'text-sm font-bold font-mono',
                          day.isToday ? 'text-rose-400' : 'text-zinc-200'
                        )}
                      >
                        {day.date.getDate()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setModalInitialDate(day.dateString);
                        setIsCreateModalOpen(true);
                      }}
                      title={`Add event on ${day.dateString}`}
                      className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Events list in this column */}
                  <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                    {dayEvents.map((ev) => {
                      const typeCfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.service;
                      return (
                        <div
                          key={ev.id}
                          onClick={() => handleOpenEvent(ev)}
                          className={clsx(
                            'p-2.5 rounded-lg border text-left cursor-pointer transition-all hover:scale-[1.02] group',
                            typeCfg.bg,
                            typeCfg.border
                          )}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="font-bold text-zinc-400">
                              {ev.allDay ? 'ALL DAY' : formatTime(ev.startAt)}
                            </span>
                            <span className="text-zinc-500">{ev.eventNumber}</span>
                          </div>
                          <h5 className="text-xs font-bold text-zinc-100 group-hover:text-rose-300 line-clamp-2 mt-0.5">
                            {ev.title}
                          </h5>
                          {ev.location && (
                            <div className="text-[10px] text-zinc-400 truncate mt-1">
                              📍 {ev.location}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {dayEvents.length === 0 && (
                      <div className="h-20 flex items-center justify-center text-[10px] text-zinc-600 italic">
                        No events
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 3: MONTH VIEW */}
        {viewMode === 'month' && (
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-artemis-900/60 flex flex-col h-full min-h-[600px]">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-zinc-800 bg-artemis-950 text-center text-xs font-bold text-zinc-400 py-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Month grid cells */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-zinc-800/80">
              {monthGrid.map((cell) => {
                const cellEvents = getEventsForDate(cell.dateString);
                return (
                  <div
                    key={cell.dateString}
                    onClick={() => {
                      setCurrentDate(cell.date);
                      setViewMode('today');
                    }}
                    className={clsx(
                      'p-2 min-h-[90px] flex flex-col cursor-pointer transition-colors hover:bg-zinc-800/30',
                      !cell.isCurrentMonth && 'opacity-40 bg-artemis-950/40',
                      cell.isToday && 'bg-rose-950/10 ring-1 ring-inset ring-rose-500/30'
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span
                        className={clsx(
                          'font-bold px-1.5 py-0.5 rounded',
                          cell.isToday ? 'bg-rose-500 text-zinc-950' : 'text-zinc-300'
                        )}
                      >
                        {cell.date.getDate()}
                      </span>
                      {cellEvents.length > 0 && (
                        <span className="text-[10px] text-zinc-500">{cellEvents.length}</span>
                      )}
                    </div>

                    <div className="space-y-1 flex-1 overflow-hidden">
                      {cellEvents.slice(0, 3).map((ev) => {
                        const typeCfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.service;
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEvent(ev);
                            }}
                            className={clsx(
                              'text-[10px] px-1.5 py-0.5 rounded border truncate font-medium hover:opacity-90',
                              typeCfg.bg,
                              typeCfg.text,
                              typeCfg.border
                            )}
                          >
                            {ev.allDay ? '' : `${formatTime(ev.startAt)} `}
                            {ev.title}
                          </div>
                        );
                      })}
                      {cellEvents.length > 3 && (
                        <span className="text-[9px] text-zinc-500 font-mono block pl-1">
                          +{cellEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        initialDate={modalInitialDate}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (opts) => {
          const created = await createEvent(opts);
          openScheduleEventTab(created.id, `${created.eventNumber} — ${created.title}`);
        }}
      />
    </div>
  );
};
