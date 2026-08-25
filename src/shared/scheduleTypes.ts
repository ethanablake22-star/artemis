export type ScheduleEventType =
  | 'service'
  | 'diagnostic'
  | 'inspection'
  | 'dropoff'
  | 'pickup'
  | 'parts'
  | 'meeting'
  | 'admin'
  | 'other';

export type ScheduleEventStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface ScheduleEventRecord {
  id: string;
  eventNumber: string; // EVT-000001
  title: string;
  type: ScheduleEventType;
  status: ScheduleEventStatus;

  /** UTC epoch timestamp in milliseconds */
  startAt: number;
  /** UTC epoch timestamp in milliseconds (exclusive boundary for all-day events) */
  endAt: number;
  /** Whether the event spans entire calendar days */
  allDay: boolean;
  /** IANA timezone string e.g. "America/New_York" */
  timeZone: string;

  /** Optional linked Customer UUID */
  customerId: string | null;
  /** Optional linked Vehicle UUID */
  vehicleId: string | null;
  /** Optional linked Work Order UUID */
  workOrderId: string | null;

  location?: string;
  notes?: string;

  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}

export interface ArtemisScheduleStoreData {
  schemaVersion: 1;
  nextEventSequence: number;
  events: ScheduleEventRecord[];
}

export interface CreateScheduleEventOptions {
  title: string;
  type?: ScheduleEventType;
  status?: ScheduleEventStatus;
  startAt: number;
  endAt: number;
  allDay?: boolean;
  timeZone?: string;
  customerId?: string | null;
  vehicleId?: string | null;
  workOrderId?: string | null;
  location?: string;
  notes?: string;
}

export interface UpdateScheduleEventOptions {
  title?: string;
  type?: ScheduleEventType;
  status?: ScheduleEventStatus;
  startAt?: number;
  endAt?: number;
  allDay?: boolean;
  timeZone?: string;
  customerId?: string | null;
  vehicleId?: string | null;
  workOrderId?: string | null;
  location?: string;
  notes?: string;
}

export interface ListScheduleEventsFilter {
  /** Start of interval range in epoch ms (overlap query: event.endAt > from) */
  from?: number;
  /** End of interval range in epoch ms (overlap query: event.startAt < to) */
  to?: number;
  customerId?: string | null;
  vehicleId?: string | null;
  workOrderId?: string | null;
  status?: ScheduleEventStatus;
  type?: ScheduleEventType;
  includeDeleted?: boolean;
  query?: string;
}

export interface OverlapConflictInfo {
  hasConflict: boolean;
  conflicts: Array<{
    id: string;
    eventNumber: string;
    title: string;
    startAt: number;
    endAt: number;
    status: ScheduleEventStatus;
  }>;
}

export interface ScheduleBridge {
  list: (filter?: ListScheduleEventsFilter) => Promise<ScheduleEventRecord[]>;
  get: (id: string) => Promise<ScheduleEventRecord | null>;
  create: (options: CreateScheduleEventOptions) => Promise<ScheduleEventRecord>;
  update: (id: string, updates: UpdateScheduleEventOptions) => Promise<ScheduleEventRecord>;
  delete: (id: string) => Promise<boolean>;
  checkOverlap: (startAt: number, endAt: number, excludeEventId?: string) => Promise<OverlapConflictInfo>;
}

export interface IScheduleStorageRepository {
  listEvents(filter?: ListScheduleEventsFilter): Promise<ScheduleEventRecord[]>;
  getEvent(id: string): Promise<ScheduleEventRecord | null>;
  createEvent(options: CreateScheduleEventOptions): Promise<ScheduleEventRecord>;
  updateEvent(id: string, updates: UpdateScheduleEventOptions): Promise<ScheduleEventRecord>;
  deleteEvent(id: string): Promise<boolean>;
  checkOverlap(startAt: number, endAt: number, excludeEventId?: string): Promise<OverlapConflictInfo>;
}
