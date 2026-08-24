import type { LibraryBridge } from './libraryTypes';
import type { DocumentsBridge } from './documentTypes';

export type ArtemisTabType =
  | 'home'
  | 'library'
  | 'web'
  | 'document'
  | 'spreadsheet'
  | 'code'
  | 'cad'
  | 'pcb'
  | 'calendar'
  | 'automotive';

export interface ArtemisTab {
  /** Unique tab identifier */
  id: string;
  /** Tab type determining which engine or view is rendered */
  type: ArtemisTabType;
  /** Display title in tab header */
  title: string;
  /** Optional resource ID (e.g. Library item UUID for documents) */
  resourceId?: string;
  /** Icon identifier or name */
  icon?: string;
  /** Whether the user can close this tab */
  closable: boolean;
  /** Custom state preserved for this tab instance */
  state?: Record<string, unknown>;
  /** Optional metadata associated with the tab */
  metadata?: {
    path?: string;
    url?: string;
    description?: string;
    unsavedChanges?: boolean;
    createdAt?: number;
    lastActiveAt?: number;
  };
}

export interface AppLauncherItem {
  id: string;
  title: string;
  description: string;
  type: ArtemisTabType;
  icon: string;
  category: 'core' | 'productivity' | 'engineering' | 'operations';
  enabled: boolean;
  badge?: string;
}

export interface ArtemisWindowBridge {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  getAppVersion: () => Promise<string>;
  library: LibraryBridge;
  documents: DocumentsBridge;
}

declare global {
  interface Window {
    artemisAPI?: ArtemisWindowBridge;
  }
}
