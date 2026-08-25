import type {
  ScheduleEventRecord,
  CreateScheduleEventOptions,
  UpdateScheduleEventOptions,
  ListScheduleEventsFilter,
  OverlapConflictInfo,
  IScheduleStorageRepository,
} from '@shared/scheduleTypes';

const LOCAL_STORAGE_SCHEDULE_KEY = 'artemis_schedule_events_browser_dev';

function isElectronEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.artemisAPI !== undefined) return true;
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')) {
    return true;
  }
  return false;
}

export class LocalScheduleRepository implements IScheduleStorageRepository {
  private browserDevEvents: ScheduleEventRecord[] | null = null;
  private nextEventSeq = 1;

  async listEvents(filter?: ListScheduleEventsFilter): Promise<ScheduleEventRecord[]> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.schedule?.list) {
        throw new Error('Artemis Schedule IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.schedule.list(filter);
    }
    return this.browserDevListEvents(filter);
  }

  async getEvent(id: string): Promise<ScheduleEventRecord | null> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.schedule?.get) {
        throw new Error('Artemis Schedule IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.schedule.get(id);
    }
    return this.browserDevGetEvent(id);
  }

  async createEvent(options: CreateScheduleEventOptions): Promise<ScheduleEventRecord> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.schedule?.create) {
        throw new Error('Artemis Schedule IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.schedule.create(options);
    }
    return this.browserDevCreateEvent(options);
  }

  async updateEvent(id: string, updates: UpdateScheduleEventOptions): Promise<ScheduleEventRecord> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.schedule?.update) {
        throw new Error('Artemis Schedule IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.schedule.update(id, updates);
    }
    return this.browserDevUpdateEvent(id, updates);
  }

  async deleteEvent(id: string): Promise<boolean> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.schedule?.delete) {
        throw new Error('Artemis Schedule IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.schedule.delete(id);
    }
    return this.browserDevDeleteEvent(id);
  }

  async checkOverlap(
    startAt: number,
    endAt: number,
    excludeEventId?: string
  ): Promise<OverlapConflictInfo> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.schedule?.checkOverlap) {
        throw new Error('Artemis Schedule IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.schedule.checkOverlap(startAt, endAt, excludeEventId);
    }
    return this.browserDevCheckOverlap(startAt, endAt, excludeEventId);
  }

  // ---------------------------------------------------------------------------
  // Browser Dev Mode Helpers
  // ---------------------------------------------------------------------------

  private async browserDevLoadEvents(): Promise<ScheduleEventRecord[]> {
    if (this.browserDevEvents === null) {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_SCHEDULE_KEY);
        this.browserDevEvents = raw ? JSON.parse(raw) : [];
        this.nextEventSeq = (this.browserDevEvents?.length || 0) + 1;
      } catch {
        this.browserDevEvents = [];
      }
    }
    return this.browserDevEvents || [];
  }

  private async browserDevSaveEvents(items: ScheduleEventRecord[]): Promise<void> {
    this.browserDevEvents = [...items];
    try {
      localStorage.setItem(LOCAL_STORAGE_SCHEDULE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('LocalStorage save failed for schedule events:', e);
    }
  }

  private async browserDevListEvents(
    filter?: ListScheduleEventsFilter
  ): Promise<ScheduleEventRecord[]> {
    const list = await this.browserDevLoadEvents();
    let res = list;
    if (!filter?.includeDeleted) res = res.filter((e) => !e.isDeleted);
    if (filter?.from !== undefined && filter?.to !== undefined) {
      res = res.filter((e) => e.startAt < filter.to! && e.endAt > filter.from!);
    } else if (filter?.from !== undefined) {
      res = res.filter((e) => e.endAt > filter.from!);
    } else if (filter?.to !== undefined) {
      res = res.filter((e) => e.startAt < filter.to!);
    }
    if (filter?.customerId !== undefined) res = res.filter((e) => e.customerId === filter.customerId);
    if (filter?.vehicleId !== undefined) res = res.filter((e) => e.vehicleId === filter.vehicleId);
    if (filter?.workOrderId !== undefined) res = res.filter((e) => e.workOrderId === filter.workOrderId);
    if (filter?.status) res = res.filter((e) => e.status === filter.status);
    if (filter?.type) res = res.filter((e) => e.type === filter.type);
    if (filter?.query) {
      const q = filter.query.toLowerCase();
      res = res.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.eventNumber.toLowerCase().includes(q) ||
          (e.location && e.location.toLowerCase().includes(q))
      );
    }
    return res.sort((a, b) => a.startAt - b.startAt);
  }

  private async browserDevGetEvent(id: string): Promise<ScheduleEventRecord | null> {
    const list = await this.browserDevLoadEvents();
    return list.find((e) => e.id === id) || null;
  }

  private async browserDevCreateEvent(
    options: CreateScheduleEventOptions
  ): Promise<ScheduleEventRecord> {
    const list = await this.browserDevLoadEvents();
    const now = Date.now();
    const eventNumber = `EVT-${String(this.nextEventSeq++).padStart(6, '0')}`;
    const newEvent: ScheduleEventRecord = {
      id: `evt-${now}-${Math.random().toString(36).substring(2, 6)}`,
      eventNumber,
      title: options.title.trim(),
      type: options.type || 'service',
      status: options.status || 'scheduled',
      startAt: options.startAt,
      endAt: options.endAt,
      allDay: !!options.allDay,
      timeZone: options.timeZone || 'UTC',
      customerId: options.customerId ?? null,
      vehicleId: options.vehicleId ?? null,
      workOrderId: options.workOrderId ?? null,
      location: options.location?.trim() || undefined,
      notes: options.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    list.push(newEvent);
    await this.browserDevSaveEvents(list);
    return newEvent;
  }

  private async browserDevUpdateEvent(
    id: string,
    updates: UpdateScheduleEventOptions
  ): Promise<ScheduleEventRecord> {
    const list = await this.browserDevLoadEvents();
    const event = list.find((e) => e.id === id);
    if (!event) throw new Error('Event not found');
    if (updates.title !== undefined) event.title = updates.title.trim();
    if (updates.type !== undefined) event.type = updates.type;
    if (updates.status !== undefined) event.status = updates.status;
    if (updates.startAt !== undefined) event.startAt = updates.startAt;
    if (updates.endAt !== undefined) event.endAt = updates.endAt;
    if (updates.allDay !== undefined) event.allDay = updates.allDay;
    if (updates.timeZone !== undefined) event.timeZone = updates.timeZone;
    if (updates.customerId !== undefined) event.customerId = updates.customerId;
    if (updates.vehicleId !== undefined) event.vehicleId = updates.vehicleId;
    if (updates.workOrderId !== undefined) event.workOrderId = updates.workOrderId;
    if (updates.location !== undefined) event.location = updates.location.trim() || undefined;
    if (updates.notes !== undefined) event.notes = updates.notes.trim() || undefined;
    event.updatedAt = Date.now();
    await this.browserDevSaveEvents(list);
    return event;
  }

  private async browserDevDeleteEvent(id: string): Promise<boolean> {
    const list = await this.browserDevLoadEvents();
    const event = list.find((e) => e.id === id);
    if (!event) throw new Error('Event not found');
    event.isDeleted = true;
    event.updatedAt = Date.now();
    await this.browserDevSaveEvents(list);
    return true;
  }

  private async browserDevCheckOverlap(
    startAt: number,
    endAt: number,
    excludeEventId?: string
  ): Promise<OverlapConflictInfo> {
    const list = await this.browserDevLoadEvents();
    const conflicts: OverlapConflictInfo['conflicts'] = [];
    const conflictStatuses = new Set(['scheduled', 'confirmed', 'in_progress']);

    for (const ev of list) {
      if (ev.isDeleted) continue;
      if (excludeEventId && ev.id === excludeEventId) continue;
      if (!conflictStatuses.has(ev.status)) continue;

      if (ev.startAt < endAt && ev.endAt > startAt) {
        conflicts.push({
          id: ev.id,
          eventNumber: ev.eventNumber,
          title: ev.title,
          startAt: ev.startAt,
          endAt: ev.endAt,
          status: ev.status,
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }
}

export const scheduleRepository = new LocalScheduleRepository();
