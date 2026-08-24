import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  LibraryItem,
  LibraryStoreData,
  CreateLibraryItemOptions,
  UpdateLibraryItemOptions,
  ListLibraryItemsFilter,
} from '../shared/libraryTypes';

export const CURRENT_SCHEMA_VERSION = 1;
const STORE_FILENAME = 'artemis_library_store.json';

export class UnsupportedSchemaVersionError extends Error {
  constructor(public version: number) {
    super(`Unsupported library schema version: ${version}. Please update Artemis.`);
    this.name = 'UnsupportedSchemaVersionError';
  }
}

const INITIAL_SEED_ITEMS: LibraryItem[] = [
  {
    id: 'f-root-projects',
    name: 'Projects',
    type: 'folder',
    parentId: null,
    createdAt: 1724500000000,
    updatedAt: 1724500000000,
    isDeleted: false,
    metadata: { description: 'Primary engineering and workspace projects' },
  },
  {
    id: 'f-nested-avionics',
    name: 'Avionics & Telemetry',
    type: 'folder',
    parentId: 'f-root-projects',
    createdAt: 1724500100000,
    updatedAt: 1724500100000,
    isDeleted: false,
    metadata: { description: 'CAN bus, sensor arrays, and ECU firmware' },
  },
  {
    id: 'd-telemetry-spec',
    name: 'telemetry_protocol_v1.doc',
    type: 'document',
    parentId: 'f-nested-avionics',
    createdAt: 1724500200000,
    updatedAt: 1724500200000,
    isDeleted: false,
    metadata: { size: 14200, description: 'CAN bus packet specifications' },
  },
  {
    id: 'f-root-documents',
    name: 'Documents & Notes',
    type: 'folder',
    parentId: null,
    createdAt: 1724500300000,
    updatedAt: 1724500300000,
    isDeleted: false,
    metadata: { description: 'Architecture specs, meeting logs, and guides' },
  },
  {
    id: 'd-artemis-overview',
    name: 'artemis_system_architecture.doc',
    type: 'document',
    parentId: 'f-root-documents',
    createdAt: 1724500400000,
    updatedAt: 1724500400000,
    isDeleted: false,
    metadata: { size: 28500, description: 'Universal tab platform architectural overview' },
  },
];

function getStoreFilePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, STORE_FILENAME);
}

/**
 * Migration & validation pipeline for library store files.
 */
function validateAndMigrateStore(raw: unknown): LibraryStoreData {
  if (!raw || typeof raw !== 'object') {
    return {
      schemaVersion: 1,
      items: INITIAL_SEED_ITEMS,
    };
  }

  const obj = raw as Record<string, unknown>;

  // Handle versioned schema
  const version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : (typeof obj.version === 'number' ? obj.version : 1);

  switch (version) {
    case 1: {
      const items = Array.isArray(obj.items) ? (obj.items as LibraryItem[]) : INITIAL_SEED_ITEMS;
      return {
        schemaVersion: 1,
        items,
      };
    }
    default: {
      if (version > CURRENT_SCHEMA_VERSION) {
        throw new UnsupportedSchemaVersionError(version);
      }
      // Future schema migration hooks (e.g. v2 -> v3) will be plugged here
      throw new UnsupportedSchemaVersionError(version);
    }
  }
}

let inMemoryCache: LibraryStoreData | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function readStoreFile(): Promise<LibraryStoreData> {
  if (inMemoryCache) {
    return inMemoryCache;
  }

  const filePath = getStoreFilePath();
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const validated = validateAndMigrateStore(parsed);
    inMemoryCache = validated;
    return validated;
  } catch (err: unknown) {
    if (err instanceof UnsupportedSchemaVersionError) {
      throw err;
    }
    // If file is missing or invalid JSON, seed fresh store
    const initialStore: LibraryStoreData = {
      schemaVersion: 1,
      items: INITIAL_SEED_ITEMS,
    };
    await writeStoreFile(initialStore);
    inMemoryCache = initialStore;
    return initialStore;
  }
}

async function writeStoreFile(store: LibraryStoreData): Promise<void> {
  inMemoryCache = store;

  // Queue writes sequentially to prevent race conditions during atomic replacement
  writeQueue = writeQueue.then(async () => {
    const filePath = getStoreFilePath();
    const tempPath = `${filePath}.tmp.${crypto.randomBytes(4).toString('hex')}`;
    const payload = JSON.stringify(store, null, 2);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tempPath, payload, 'utf-8');
    await fs.rename(tempPath, filePath);
  }).catch((err) => {
    console.error('Failed to write library store to disk:', err);
    throw err;
  });

  return writeQueue;
}

// -----------------------------------------------------------------------------
// Authoritative Library Mutation Operations
// -----------------------------------------------------------------------------

export async function listItems(filter?: ListLibraryItemsFilter): Promise<LibraryItem[]> {
  const store = await readStoreFile();
  let result = store.items;

  if (!filter?.includeDeleted) {
    result = result.filter((item) => !item.isDeleted);
  }

  if (filter?.parentId !== undefined) {
    result = result.filter((item) => item.parentId === filter.parentId);
  }

  return result;
}

export async function getItem(id: string): Promise<LibraryItem | null> {
  const store = await readStoreFile();
  const found = store.items.find((item) => item.id === id);
  return found || null;
}

export async function createItem(options: CreateLibraryItemOptions): Promise<LibraryItem> {
  const name = options.name ? options.name.trim() : '';
  if (!name) {
    throw new Error('Item name cannot be empty');
  }

  if (!['folder', 'document', 'file'].includes(options.type)) {
    throw new Error(`Invalid item type: ${options.type}`);
  }

  const store = await readStoreFile();

  // Validate parentId if provided
  const parentId = options.parentId !== undefined ? options.parentId : null;
  if (parentId !== null) {
    const parent = store.items.find((it) => it.id === parentId && !it.isDeleted);
    if (!parent) {
      throw new Error(`Target parent folder "${parentId}" does not exist`);
    }
    if (parent.type !== 'folder') {
      throw new Error(`Target parent "${parentId}" is not a folder`);
    }
  }

  const now = Date.now();
  const newItem: LibraryItem = {
    id: crypto.randomUUID(),
    name,
    type: options.type,
    parentId,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    metadata: options.metadata || {},
  };

  store.items.push(newItem);
  await writeStoreFile(store);
  return newItem;
}

export async function updateItem(id: string, updates: UpdateLibraryItemOptions): Promise<LibraryItem> {
  const store = await readStoreFile();
  const index = store.items.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error(`Library item "${id}" not found`);
  }

  const current = store.items[index];

  let newName = current.name;
  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (!trimmed) {
      throw new Error('Item name cannot be empty');
    }
    newName = trimmed;
  }

  const updatedItem: LibraryItem = {
    ...current,
    name: newName,
    metadata: updates.metadata !== undefined ? { ...current.metadata, ...updates.metadata } : current.metadata,
    updatedAt: Date.now(),
  };

  store.items[index] = updatedItem;
  await writeStoreFile(store);
  return updatedItem;
}

export async function moveItem(id: string, newParentId: string | null): Promise<LibraryItem> {
  const store = await readStoreFile();
  const index = store.items.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error(`Library item "${id}" not found`);
  }

  const current = store.items[index];

  if (newParentId !== null) {
    // Validate target parent exists and is a folder
    const targetParent = store.items.find((it) => it.id === newParentId && !it.isDeleted);
    if (!targetParent) {
      throw new Error(`Target parent folder "${newParentId}" does not exist`);
    }
    if (targetParent.type !== 'folder') {
      throw new Error(`Target parent "${newParentId}" is not a folder`);
    }

    // Cycle detection: cannot move folder into itself or any of its descendants
    if (id === newParentId) {
      throw new Error('Cannot move a folder into itself');
    }

    let checkParent: string | null = targetParent.parentId;
    while (checkParent !== null) {
      if (checkParent === id) {
        throw new Error('Cannot move a folder into one of its descendants (cyclic nesting)');
      }
      const ancestor = store.items.find((it) => it.id === checkParent);
      checkParent = ancestor ? ancestor.parentId : null;
    }
  }

  const updatedItem: LibraryItem = {
    ...current,
    parentId: newParentId,
    updatedAt: Date.now(),
  };

  store.items[index] = updatedItem;
  await writeStoreFile(store);
  return updatedItem;
}

/**
 * Performs authoritative cascading soft-deletion in the Electron main process.
 */
export async function deleteItem(id: string): Promise<boolean> {
  const store = await readStoreFile();
  const index = store.items.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error(`Library item "${id}" not found`);
  }

  // Find all recursive descendant IDs
  const collectDescendants = (parentId: string): string[] => {
    const children = store.items.filter((item) => item.parentId === parentId);
    let descIds: string[] = [];
    for (const child of children) {
      descIds.push(child.id);
      if (child.type === 'folder') {
        descIds = descIds.concat(collectDescendants(child.id));
      }
    }
    return descIds;
  };

  const targetIds = new Set([id, ...collectDescendants(id)]);
  const now = Date.now();

  store.items = store.items.map((item) => {
    if (targetIds.has(item.id)) {
      return {
        ...item,
        isDeleted: true,
        updatedAt: now,
      };
    }
    return item;
  });

  await writeStoreFile(store);
  return true;
}
