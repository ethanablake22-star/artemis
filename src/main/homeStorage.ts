import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import type {
  CurrentMissionReference,
  SetCurrentMissionOptions,
  ArtemisHomeStoreData,
} from '../shared/homeTypes';
import { getWorkOrder } from './automotiveStorage';
import { getScheduleEvent } from './scheduleStorage';
import { getItem } from './libraryStorage';

const STORE_FILE = 'artemis_home_store.json';
const CURRENT_HOME_SCHEMA_VERSION = 1;

function getStorePath(): string {
  return path.join(app.getPath('userData'), STORE_FILE);
}

function createEmptyHomeStore(): ArtemisHomeStoreData {
  return {
    schemaVersion: CURRENT_HOME_SCHEMA_VERSION,
    currentMission: null,
  };
}

async function atomicWriteFile(filePath: string, data: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 8)}`;
  await fs.writeFile(tempPath, data, 'utf-8');
  await fs.rename(tempPath, filePath);
}

async function readHomeStoreFile(): Promise<ArtemisHomeStoreData> {
  const filePath = getStorePath();
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data: ArtemisHomeStoreData = JSON.parse(raw);

    if (!data.schemaVersion || typeof data.schemaVersion !== 'number') {
      return createEmptyHomeStore();
    }

    if (data.schemaVersion > CURRENT_HOME_SCHEMA_VERSION) {
      throw new Error(
        `Unsupported home store schema version ${data.schemaVersion}. Please upgrade Artemis.`
      );
    }

    return data;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      const initial = createEmptyHomeStore();
      await writeHomeStoreFile(initial);
      return initial;
    }
    throw err;
  }
}

async function writeHomeStoreFile(store: ArtemisHomeStoreData): Promise<void> {
  const filePath = getStorePath();
  await atomicWriteFile(filePath, JSON.stringify(store, null, 2));
}

// -----------------------------------------------------------------------------
// Authoritative Home & Current Mission CRUD Operations
// -----------------------------------------------------------------------------

export async function getCurrentMission(): Promise<CurrentMissionReference | null> {
  const store = await readHomeStoreFile();
  return store.currentMission || null;
}

export async function setCurrentMission(
  options: SetCurrentMissionOptions
): Promise<CurrentMissionReference> {
  const { resourceType, resourceId } = options;

  if (!resourceType || !resourceId || typeof resourceId !== 'string') {
    throw new Error('Valid resourceType and resourceId are required to set Current Mission');
  }

  // Authoritative resource verification via owning subsystem interfaces
  switch (resourceType) {
    case 'work-order': {
      const workOrder = await getWorkOrder(resourceId);
      if (!workOrder) {
        throw new Error(`Work Order "${resourceId}" does not exist`);
      }
      if (workOrder.isDeleted) {
        throw new Error(`Cannot set archived Work Order "${resourceId}" as Current Mission`);
      }
      if (workOrder.status === 'completed' || workOrder.status === 'cancelled') {
        throw new Error(
          `Cannot set ${workOrder.status} Work Order ${workOrder.workOrderNumber} as Current Mission`
        );
      }
      break;
    }
    case 'schedule-event': {
      const event = await getScheduleEvent(resourceId);
      if (!event) {
        throw new Error(`Schedule Event "${resourceId}" does not exist`);
      }
      if (event.isDeleted) {
        throw new Error(`Cannot set archived Schedule Event "${resourceId}" as Current Mission`);
      }
      if (
        event.status === 'completed' ||
        event.status === 'cancelled' ||
        event.status === 'no_show'
      ) {
        throw new Error(
          `Cannot set ${event.status} appointment ${event.eventNumber} as Current Mission`
        );
      }
      break;
    }
    case 'document': {
      const item = await getItem(resourceId);
      if (!item) {
        throw new Error(`Document "${resourceId}" does not exist`);
      }
      if (item.isDeleted) {
        throw new Error(`Cannot set archived Document "${resourceId}" as Current Mission`);
      }
      if (item.type !== 'document') {
        throw new Error(`Resource "${resourceId}" is not a Document`);
      }
      break;
    }
    default:
      throw new Error(`Unsupported resource type "${resourceType}" for Current Mission`);
  }

  const store = await readHomeStoreFile();
  const missionRef: CurrentMissionReference = {
    resourceType,
    resourceId,
    setAt: Date.now(),
  };

  store.currentMission = missionRef;
  await writeHomeStoreFile(store);
  return missionRef;
}

export async function clearCurrentMission(): Promise<boolean> {
  const store = await readHomeStoreFile();
  store.currentMission = null;
  await writeHomeStoreFile(store);
  return true;
}
