import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  ScheduleEventRecord,
  CreateScheduleEventOptions,
  UpdateScheduleEventOptions,
  OverlapConflictInfo,
} from '@shared/scheduleTypes';
import { getAllDayBounds, getDateKeyInZone } from '@shared/scheduleUtils';
import { scheduleRepository } from '../services/scheduleStorage';

interface ScheduleContextValue {
  events: ScheduleEventRecord[];
  todayEvents: ScheduleEventRecord[];
  upcomingEvents: ScheduleEventRecord[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createEvent: (options: CreateScheduleEventOptions) => Promise<ScheduleEventRecord>;
  updateEvent: (id: string, updates: UpdateScheduleEventOptions) => Promise<ScheduleEventRecord>;
  deleteEvent: (id: string) => Promise<boolean>;
  getEventById: (id: string) => ScheduleEventRecord | undefined;
  getCustomerEvents: (customerId: string) => ScheduleEventRecord[];
  getVehicleEvents: (vehicleId: string) => ScheduleEventRecord[];
  getWorkOrderEvents: (workOrderId: string) => ScheduleEventRecord[];
  checkOverlap: (startAt: number, endAt: number, excludeEventId?: string) => Promise<OverlapConflictInfo>;
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export const ScheduleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<ScheduleEventRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await scheduleRepository.listEvents();
      setEvents(fetched);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Failed to load schedule data:', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleCreateEvent = useCallback(
    async (options: CreateScheduleEventOptions): Promise<ScheduleEventRecord> => {
      setError(null);
      try {
        const created = await scheduleRepository.createEvent(options);
        setEvents((prev) => [...prev, created].sort((a, b) => a.startAt - b.startAt));
        return created;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleUpdateEvent = useCallback(
    async (id: string, updates: UpdateScheduleEventOptions): Promise<ScheduleEventRecord> => {
      setError(null);
      try {
        const updated = await scheduleRepository.updateEvent(id, updates);
        setEvents((prev) =>
          prev
            .map((e) => (e.id === id ? updated : e))
            .sort((a, b) => a.startAt - b.startAt)
        );
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleDeleteEvent = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const success = await scheduleRepository.deleteEvent(id);
        if (success) {
          setEvents((prev) => prev.filter((e) => e.id !== id));
        }
        return success;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const getEventById = useCallback(
    (id: string): ScheduleEventRecord | undefined => {
      return events.find((e) => e.id === id);
    },
    [events]
  );

  const getCustomerEvents = useCallback(
    (customerId: string): ScheduleEventRecord[] => {
      return events.filter((e) => e.customerId === customerId && !e.isDeleted);
    },
    [events]
  );

  const getVehicleEvents = useCallback(
    (vehicleId: string): ScheduleEventRecord[] => {
      return events.filter((e) => e.vehicleId === vehicleId && !e.isDeleted);
    },
    [events]
  );

  const getWorkOrderEvents = useCallback(
    (workOrderId: string): ScheduleEventRecord[] => {
      return events.filter((e) => e.workOrderId === workOrderId && !e.isDeleted);
    },
    [events]
  );

  const handleCheckOverlap = useCallback(
    async (startAt: number, endAt: number, excludeEventId?: string): Promise<OverlapConflictInfo> => {
      return scheduleRepository.checkOverlap(startAt, endAt, excludeEventId);
    },
    []
  );

  // Today and upcoming calculations using DST-safe interval overlap
  const todayEvents = useMemo(() => {
    const todayStr = getDateKeyInZone(Date.now());
    const { startAt: startOfDay, endAt: endOfDay } = getAllDayBounds(todayStr, todayStr);
    return events.filter((e) => !e.isDeleted && e.startAt < endOfDay && e.endAt > startOfDay);
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((e) => !e.isDeleted && e.endAt >= now && e.status !== 'cancelled' && e.status !== 'completed');
  }, [events]);

  const value = useMemo(
    () => ({
      events,
      todayEvents,
      upcomingEvents,
      isLoading,
      error,
      refreshData,
      createEvent: handleCreateEvent,
      updateEvent: handleUpdateEvent,
      deleteEvent: handleDeleteEvent,
      getEventById,
      getCustomerEvents,
      getVehicleEvents,
      getWorkOrderEvents,
      checkOverlap: handleCheckOverlap,
    }),
    [
      events,
      todayEvents,
      upcomingEvents,
      isLoading,
      error,
      refreshData,
      handleCreateEvent,
      handleUpdateEvent,
      handleDeleteEvent,
      getEventById,
      getCustomerEvents,
      getVehicleEvents,
      getWorkOrderEvents,
      handleCheckOverlap,
    ]
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

export const useSchedule = (): ScheduleContextValue => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
};
