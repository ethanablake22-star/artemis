import { contextBridge, ipcRenderer } from 'electron';
import type { ArtemisWindowBridge } from '../shared/types';
import type {
  LibraryItem,
  CreateLibraryItemOptions,
  UpdateLibraryItemOptions,
  ListLibraryItemsFilter,
} from '../shared/libraryTypes';
import type { ArtemisDocumentRecord, ExportPdfResult } from '../shared/documentTypes';

const bridge: ArtemisWindowBridge = {
  minimize: () => ipcRenderer.send('artemis:window:minimize'),
  maximize: () => ipcRenderer.send('artemis:window:maximize'),
  close: () => ipcRenderer.send('artemis:window:close'),
  isMaximized: () => ipcRenderer.invoke('artemis:window:isMaximized'),
  getAppVersion: () => ipcRenderer.invoke('artemis:app:version'),
  library: {
    list: (filter?: ListLibraryItemsFilter): Promise<LibraryItem[]> =>
      ipcRenderer.invoke('artemis:library:list', filter),
    get: (id: string): Promise<LibraryItem | null> =>
      ipcRenderer.invoke('artemis:library:get', id),
    create: (options: CreateLibraryItemOptions): Promise<LibraryItem> =>
      ipcRenderer.invoke('artemis:library:create', options),
    update: (id: string, updates: UpdateLibraryItemOptions): Promise<LibraryItem> =>
      ipcRenderer.invoke('artemis:library:update', id, updates),
    move: (id: string, newParentId: string | null): Promise<LibraryItem> =>
      ipcRenderer.invoke('artemis:library:move', id, newParentId),
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('artemis:library:delete', id),
  },
  documents: {
    get: (libraryItemId: string): Promise<ArtemisDocumentRecord> =>
      ipcRenderer.invoke('artemis:documents:get', libraryItemId),
    updateContent: (
      libraryItemId: string,
      content: Record<string, unknown>
    ): Promise<ArtemisDocumentRecord> =>
      ipcRenderer.invoke('artemis:documents:updateContent', libraryItemId, content),
    exportPDF: (defaultTitle?: string): Promise<ExportPdfResult> =>
      ipcRenderer.invoke('artemis:documents:exportPDF', defaultTitle),
  },
};

contextBridge.exposeInMainWorld('artemisAPI', bridge);
