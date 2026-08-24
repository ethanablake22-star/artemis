import type {
  LibraryItem,
  ILibraryStorageRepository,
  CreateLibraryItemOptions,
  UpdateLibraryItemOptions,
  ListLibraryItemsFilter,
} from '@shared/libraryTypes';

const LOCAL_STORAGE_DEV_KEY = 'artemis_library_store_items_browser_dev';

function isElectronEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.artemisAPI !== undefined) return true;
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')) {
    return true;
  }
  return false;
}

const BROWSER_DEV_SEED_ITEMS: LibraryItem[] = [
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

/**
 * Local Library Repository.
 * Routes all mutations to authoritative Electron Main IPC.
 * When running in Electron, failures are thrown as explicit errors (no silent fallback).
 * Browser dev fallback only activates if explicitly run in standalone web browser.
 */
export class LocalLibraryRepository implements ILibraryStorageRepository {
  private browserDevItems: LibraryItem[] | null = null;

  async listItems(filter?: ListLibraryItemsFilter): Promise<LibraryItem[]> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.library?.list) {
        throw new Error('Artemis Library IPC bridge is unavailable in Electron environment.');
      }
      return window.artemisAPI.library.list(filter);
    }

    // Explicit browser development-only fallback
    return this.browserDevList(filter);
  }

  async getItem(id: string): Promise<LibraryItem | null> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.library?.get) {
        throw new Error('Artemis Library IPC bridge is unavailable in Electron environment.');
      }
      return window.artemisAPI.library.get(id);
    }

    const items = await this.browserDevList({ includeDeleted: true });
    return items.find((it) => it.id === id) || null;
  }

  async createItem(options: CreateLibraryItemOptions): Promise<LibraryItem> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.library?.create) {
        throw new Error('Artemis Library IPC bridge is unavailable in Electron environment.');
      }
      return window.artemisAPI.library.create(options);
    }

    return this.browserDevCreate(options);
  }

  async updateItem(id: string, updates: UpdateLibraryItemOptions): Promise<LibraryItem> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.library?.update) {
        throw new Error('Artemis Library IPC bridge is unavailable in Electron environment.');
      }
      return window.artemisAPI.library.update(id, updates);
    }

    return this.browserDevUpdate(id, updates);
  }

  async moveItem(id: string, newParentId: string | null): Promise<LibraryItem> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.library?.move) {
        throw new Error('Artemis Library IPC bridge is unavailable in Electron environment.');
      }
      return window.artemisAPI.library.move(id, newParentId);
    }

    return this.browserDevMove(id, newParentId);
  }

  async deleteItem(id: string): Promise<boolean> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.library?.delete) {
        throw new Error('Artemis Library IPC bridge is unavailable in Electron environment.');
      }
      return window.artemisAPI.library.delete(id);
    }

    return this.browserDevDelete(id);
  }

  // ---------------------------------------------------------------------------
  // Browser Development-Only Helpers (Never called in Electron)
  // ---------------------------------------------------------------------------

  private async browserDevList(filter?: ListLibraryItemsFilter): Promise<LibraryItem[]> {
    if (this.browserDevItems === null) {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_DEV_KEY);
        this.browserDevItems = raw ? JSON.parse(raw) : [...BROWSER_DEV_SEED_ITEMS];
      } catch {
        this.browserDevItems = [...BROWSER_DEV_SEED_ITEMS];
      }
    }

    let result = this.browserDevItems || [];
    if (!filter?.includeDeleted) {
      result = result.filter((it) => !it.isDeleted);
    }
    if (filter?.parentId !== undefined) {
      result = result.filter((it) => it.parentId === filter.parentId);
    }
    return [...result];
  }

  private async browserDevSave(items: LibraryItem[]): Promise<void> {
    this.browserDevItems = [...items];
    try {
      localStorage.setItem(LOCAL_STORAGE_DEV_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Browser localStorage save failed:', e);
    }
  }

  private async browserDevCreate(options: CreateLibraryItemOptions): Promise<LibraryItem> {
    const items = await this.browserDevList({ includeDeleted: true });
    const now = Date.now();
    const newItem: LibraryItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: options.name.trim(),
      type: options.type,
      parentId: options.parentId !== undefined ? options.parentId : null,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      metadata: options.metadata || {},
    };

    items.push(newItem);
    await this.browserDevSave(items);
    return newItem;
  }

  private async browserDevUpdate(id: string, updates: UpdateLibraryItemOptions): Promise<LibraryItem> {
    const items = await this.browserDevList({ includeDeleted: true });
    const idx = items.findIndex((it) => it.id === id);
    if (idx === -1) throw new Error(`Item ${id} not found`);

    const updated = {
      ...items[idx],
      name: updates.name !== undefined ? updates.name.trim() : items[idx].name,
      metadata: updates.metadata !== undefined ? { ...items[idx].metadata, ...updates.metadata } : items[idx].metadata,
      updatedAt: Date.now(),
    };
    items[idx] = updated;
    await this.browserDevSave(items);
    return updated;
  }

  private async browserDevMove(id: string, newParentId: string | null): Promise<LibraryItem> {
    const items = await this.browserDevList({ includeDeleted: true });
    const idx = items.findIndex((it) => it.id === id);
    if (idx === -1) throw new Error(`Item ${id} not found`);

    const updated = {
      ...items[idx],
      parentId: newParentId,
      updatedAt: Date.now(),
    };
    items[idx] = updated;
    await this.browserDevSave(items);
    return updated;
  }

  private async browserDevDelete(id: string): Promise<boolean> {
    const items = await this.browserDevList({ includeDeleted: true });
    const collectDescendants = (parentId: string): string[] => {
      const children = items.filter((it) => it.parentId === parentId);
      let ids: string[] = [];
      for (const child of children) {
        ids.push(child.id);
        if (child.type === 'folder') ids = ids.concat(collectDescendants(child.id));
      }
      return ids;
    };

    const targetIds = new Set([id, ...collectDescendants(id)]);
    const now = Date.now();
    const updated = items.map((it) => (targetIds.has(it.id) ? { ...it, isDeleted: true, updatedAt: now } : it));
    await this.browserDevSave(updated);
    return true;
  }
}

export const libraryRepository = new LocalLibraryRepository();
