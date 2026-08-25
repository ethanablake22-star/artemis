import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import type {
  ScheduleEventRecord,
  ArtemisScheduleStoreData,
  CreateScheduleEventOptions,
  UpdateScheduleEventOptions,
  ListScheduleEventsFilter,
  OverlapConflictInfo,
} from '../shared/scheduleTypes';
import type { ArtemisAutomotiveStoreData } from '../shared/automotiveTypes';

const STORE_FILE = 'artemis_schedule_store.json';
const AUTOMOTIVE_STORE_FILE = 'artemis_automotive_store.json';
const CURRENT_SCHEDULE_SCHEMA_VERSION = 1;

function getStorePath(): string {
  return path.join(app.getPath('userData'), STORE_FILE);
}

function getAutomotiveStorePath(): string {
  return path.join(app.getPath('userData'), AUTOMOTIVE_STORE_FILE);
}

function getDefaultTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function createEmptyScheduleStore(): ArtemisScheduleStoreData {
  return {
    schemaVersion: CURRENT_SCHEDULE_SCHEMA_VERSION,
    nextEventSequence: 1,
    events: [],
  };
}

async function atomicWriteFile(filePath: string, data: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;
  await fs.writeFile(tempPath, data, 'utf-8');
  await fs.rename(tempPath, filePath);
}

async function readAutomotiveStoreFile(): Promise<ArtemisAutomotiveStoreData | null> {
  try {
    const raw = await fs.readFile(getAutomotiveStorePath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readScheduleStoreFile(): Promise<ArtemisScheduleStoreData> {
  const filePath = getStorePath();
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data: ArtemisScheduleStoreData = JSON.parse(raw);

    if (!data.schemaVersion || typeof data.schemaVersion !== 'number') {
      return createEmptyScheduleStore();
    }

    if (data.schemaVersion > CURRENT_SCHEDULE_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported schedule store schema version ${data.schemaVersion}. Please upgrade Artemis.`
      );
    }

    if (!Array.isArray(data.events)) {
      data.events = [];
    }

    if (typeof data.nextEventSequence !== 'number' || data.nextEventSequence < 1) {
      data.nextEventSequence = 1;
    }

    return data;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      const initial = createEmptyScheduleStore();
      await writeScheduleStoreFile(initial);
      return initial;
    }
    throw err;
  }
}

async function writeScheduleStoreFile(store: ArtemisScheduleStoreData): Promise<void> {
  const filePath = getStorePath();
  await atomicWriteFile(filePath, JSON.stringify(store, null, 2));
}

export function formatEventNumber(seq: number): string {
  return `EVT-${String(seq).padStart(6, '0')}`;
}

const CONFLICT_PRODUCING_STATUSES = new Set(['scheduled', 'confirmed', 'in_progress']);

// -----------------------------------------------------------------------------
// Overlap Detection Helper
// -----------------------------------------------------------------------------

export async function checkOverlap(
  startAt: number,
  endAt: number,
  excludeEventId?: string
): Promise<OverlapConflictInfo> {
  const store = await readScheduleStoreFile();
  const conflicts: OverlapConflictInfo['conflicts'] = [];

  for (const ev of store.events) {
    if (ev.isDeleted) continue;
    if (excludeEventId && ev.id === excludeEventId) continue;
    if (!CONFLICT_PRODUCING_STATUSES.has(ev.status)) continue;

    // Interval intersection: existing.startAt < proposed.endAt && existing.endAt > proposed.startAt
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

// -----------------------------------------------------------------------------
// Authoritative Schedule CRUD Operations
// -----------------------------------------------------------------------------

export async function listScheduleEvents(
  filter?: ListScheduleEventsFilter
): Promise<ScheduleEventRecord[]> {
  const store = await readScheduleStoreFile();
  let results = store.events;

  if (!filter?.includeDeleted) {
    results = results.filter((e) => !e.isDeleted);
  }

  // Interval overlap query for date ranges
  if (filter?.from !== undefined && filter?.to !== undefined) {
    results = results.filter((e) => e.startAt < filter.to! && e.endAt > filter.from!);
  } else if (filter?.from !== undefined) {
    results = results.filter((e) => e.endAt > filter.from!);
  } else if (filter?.to !== undefined) {
    results = results.filter((e) => e.startAt < filter.to!);
  }

  if (filter?.customerId !== undefined) {
    results = results.filter((e) => e.customerId === filter.customerId);
  }

  if (filter?.vehicleId !== undefined) {
    results = results.filter((e) => e.vehicleId === filter.vehicleId);
  }

  if (filter?.workOrderId !== undefined) {
    results = results.filter((e) => e.workOrderId === filter.workOrderId);
  }

  if (filter?.status) {
    results = results.filter((e) => e.status === filter.status);
  }

  if (filter?.type) {
    results = results.filter((e) => e.type === filter.type);
  }

  if (filter?.query && filter.query.trim()) {
    const q = filter.query.toLowerCase().trim();
    results = results.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.eventNumber.toLowerCase().includes(q) ||
        (e.location && e.location.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q))
    );
  }

  return results.sort((a, b) => a.startAt - b.startAt);
}

export async function getScheduleEvent(id: string): Promise<ScheduleEventRecord | null> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid schedule event ID provided');
  }

  const store = await readScheduleStoreFile();
  const found = store.events.find((e) => e.id === id);
  return found || null;
}

export async function createScheduleEvent(
  options: CreateScheduleEventOptions
): Promise<ScheduleEventRecord> {
  const { title, startAt, endAt, allDay } = options;

  const trimmedTitle = title?.trim();
  if (!trimmedTitle) {
    throw new Error('Event title cannot be empty');
  }

  if (typeof startAt !== 'number' || typeof endAt !== 'number' || isNaN(startAt) || isNaN(endAt)) {
    throw new Error('Valid startAt and endAt timestamps are required');
  }

  if (endAt <= startAt) {
    throw new Error('Event end time must be strictly after start time');
  }

  // Load automotive store for relationship validation
  const autoStore = await readAutomotiveStoreFile();

  let finalCustomerId: string | null = null;
  let finalVehicleId: string | null = null;
  let finalWorkOrderId: string | null = null;

  // Work Order consistency guarantee
  if (options.workOrderId) {
    if (!autoStore) {
      throw new Error(`Automotive store unavailable; cannot link Work Order "${options.workOrderId}"`);
    }
    const workOrder = (autoStore.workOrders || []).find((w) => w.id === options.workOrderId);
    if (!workOrder) {
      throw new Error(`Work Order "${options.workOrderId}" does not exist`);
    }
    if (workOrder.isDeleted) {
      throw new Error(`Cannot schedule appointment for archived Work Order "${options.workOrderId}"`);
    }

    finalWorkOrderId = workOrder.id;

    // Enforce relationship consistency: vehicleId and customerId must correspond to the Work Order
    if (options.vehicleId && options.vehicleId !== workOrder.vehicleId) {
      throw new Error(
        `Conflicting vehicle relationship: supplied vehicle "${options.vehicleId}" does not match Work Order vehicle "${workOrder.vehicleId}"`
      );
    }
    finalVehicleId = workOrder.vehicleId;

    if (options.customerId && options.customerId !== workOrder.customerId) {
      throw new Error(
        `Conflicting customer relationship: supplied customer "${options.customerId}" does not match Work Order customer "${workOrder.customerId}"`
      );
    }
    finalCustomerId = workOrder.customerId;
  } else {
    // If no workOrderId, validate independent vehicle and customer if supplied
    if (options.vehicleId) {
      if (!autoStore) {
        throw new Error(`Automotive store unavailable; cannot link Vehicle "${options.vehicleId}"`);
      }
      const vehicle = (autoStore.vehicles || []).find((v) => v.id === options.vehicleId);
      if (!vehicle) {
        throw new Error(`Vehicle "${options.vehicleId}" does not exist`);
      }
      if (vehicle.isDeleted) {
        throw new Error(`Cannot schedule appointment for archived vehicle "${options.vehicleId}"`);
      }
      finalVehicleId = vehicle.id;

      // If customer not explicitly specified, auto-link vehicle's owner
      if (options.customerId === undefined) {
        finalCustomerId = vehicle.customerId;
      }
    }

    if (options.customerId) {
      if (!autoStore) {
        throw new Error(`Automotive store unavailable; cannot link Customer "${options.customerId}"`);
      }
      const customer = (autoStore.customers || []).find((c) => c.id === options.customerId);
      if (!customer) {
        throw new Error(`Customer "${options.customerId}" does not exist`);
      }
      if (customer.isDeleted) {
        throw new Error(`Cannot schedule appointment for archived customer "${options.customerId}"`);
      }
      finalCustomerId = customer.id;
    } else if (options.customerId === null) {
      finalCustomerId = null;
    }
  }

  const store = await readScheduleStoreFile();
  const seq = store.nextEventSequence++;
  const eventNumber = formatEventNumber(seq);
  const now = Date.now();

  const newEvent: ScheduleEventRecord = {
    id: crypto.randomUUID(),
    eventNumber,
    title: trimmedTitle,
    type: options.type || 'service',
    status: options.status || 'scheduled',
    startAt,
    endAt,
    allDay: !!allDay,
    timeZone: options.timeZone?.trim() || getDefaultTimeZone(),
    customerId: finalCustomerId,
    vehicleId: finalVehicleId,
    workOrderId: finalWorkOrderId,
    location: options.location?.trim() || undefined,
    notes: options.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  store.events.push(newEvent);
  await writeScheduleStoreFile(store);
  return newEvent;
}

export async function updateScheduleEvent(
  id: string,
  updates: UpdateScheduleEventOptions
): Promise<ScheduleEventRecord> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid schedule event ID provided');
  }

  const store = await readScheduleStoreFile();
  const event = store.events.find((e) => e.id === id);

  if (!event) {
    throw new Error(`Schedule event "${id}" not found`);
  }

  if (event.isDeleted) {
    throw new Error(`Cannot update schedule event "${id}": record is deleted`);
  }

  // Validate title if updated
  if (updates.title !== undefined) {
    const trimmed = updates.title.trim();
    if (!trimmed) throw new Error('Event title cannot be empty');
    event.title = trimmed;
  }

  // Validate timestamps if updated
  const newStartAt = updates.startAt !== undefined ? updates.startAt : event.startAt;
  const newEndAt = updates.endAt !== undefined ? updates.endAt : event.endAt;

  if (updates.startAt !== undefined || updates.endAt !== undefined) {
    if (typeof newStartAt !== 'number' || typeof newEndAt !== 'number' || isNaN(newStartAt) || isNaN(newEndAt)) {
      throw new Error('Valid startAt and endAt timestamps are required');
    }
    if (newEndAt <= newStartAt) {
      throw new Error('Event end time must be strictly after start time');
    }
    event.startAt = newStartAt;
    event.endAt = newEndAt;
  }

  if (updates.allDay !== undefined) {
    event.allDay = updates.allDay;
  }

  if (updates.timeZone !== undefined) {
    event.timeZone = updates.timeZone.trim() || getDefaultTimeZone();
  }

  if (updates.type !== undefined) {
    event.type = updates.type;
  }

  if (updates.status !== undefined) {
    event.status = updates.status;
  }

  if (updates.location !== undefined) {
    event.location = updates.location.trim() || undefined;
  }

  if (updates.notes !== undefined) {
    event.notes = updates.notes.trim() || undefined;
  }

  // Relationship updates with integrity check only when changed
  const autoStore = await readAutomotiveStoreFile();

  const isChangingWorkOrder = updates.workOrderId !== undefined && updates.workOrderId !== event.workOrderId;
  const isChangingVehicle = updates.vehicleId !== undefined && updates.vehicleId !== event.vehicleId;
  const isChangingCustomer = updates.customerId !== undefined && updates.customerId !== event.customerId;

  if (isChangingWorkOrder || isChangingVehicle || isChangingCustomer) {
    const targetWorkOrderId = updates.workOrderId !== undefined ? updates.workOrderId : event.workOrderId;

    if (targetWorkOrderId) {
      if (!autoStore) throw new Error('Automotive store unavailable');
      const workOrder = (autoStore.workOrders || []).find((w) => w.id === targetWorkOrderId);
      if (!workOrder) throw new Error(`Work Order "${targetWorkOrderId}" not found`);
      if (isChangingWorkOrder && workOrder.isDeleted) {
        throw new Error(`Cannot assign archived Work Order "${targetWorkOrderId}"`);
      }

      event.workOrderId = workOrder.id;

      // Enforce consistency with Work Order
      if (updates.vehicleId !== undefined && updates.vehicleId !== workOrder.vehicleId) {
        throw new Error(
          `Conflicting vehicle relationship: vehicle "${updates.vehicleId}" does not match Work Order vehicle "${workOrder.vehicleId}"`
        );
      }
      event.vehicleId = workOrder.vehicleId;

      if (updates.customerId !== undefined && updates.customerId !== workOrder.customerId) {
        throw new Error(
          `Conflicting customer relationship: customer "${updates.customerId}" does not match Work Order customer "${workOrder.customerId}"`
        );
      }
      event.customerId = workOrder.customerId;
    } else {
      if (updates.workOrderId === null) {
        event.workOrderId = null;
      }

      if (isChangingVehicle) {
        if (updates.vehicleId === null) {
          event.vehicleId = null;
        } else if (updates.vehicleId) {
          if (!autoStore) throw new Error('Automotive store unavailable');
          const vehicle = (autoStore.vehicles || []).find((v) => v.id === updates.vehicleId);
          if (!vehicle) throw new Error(`Vehicle "${updates.vehicleId}" not found`);
          if (vehicle.isDeleted) throw new Error(`Cannot link archived vehicle "${updates.vehicleId}"`);
          event.vehicleId = vehicle.id;
        }
      }

      if (isChangingCustomer) {
        if (updates.customerId === null) {
          event.customerId = null;
        } else if (updates.customerId) {
          if (!autoStore) throw new Error('Automotive store unavailable');
          const customer = (autoStore.customers || []).find((c) => c.id === updates.customerId);
          if (!customer) throw new Error(`Customer "${updates.customerId}" not found`);
          if (customer.isDeleted) throw new Error(`Cannot link archived customer "${updates.customerId}"`);
          event.customerId = customer.id;
        }
      }
    }
  }

  event.updatedAt = Date.now();
  await writeScheduleStoreFile(store);
  return event;
}

export async function deleteScheduleEvent(id: string): Promise<boolean> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid schedule event ID provided');
  }

  const store = await readScheduleStoreFile();
  const event = store.events.find((e) => e.id === id);

  if (!event) {
    throw new Error(`Schedule event "${id}" not found`);
  }

  event.isDeleted = true;
  event.updatedAt = Date.now();
  await writeScheduleStoreFile(store);
  return true;
}
