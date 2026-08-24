import type {
  ArtemisDocumentRecord,
  IDocumentsStorageRepository,
} from '@shared/documentTypes';

const LOCAL_STORAGE_DOCS_KEY = 'artemis_documents_store_browser_dev';

function isElectronEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.artemisAPI !== undefined) return true;
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')) {
    return true;
  }
  return false;
}

const DEFAULT_BROWSER_EMPTY_DOC: Record<string, unknown> = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [],
    },
  ],
};

export class LocalDocumentsRepository implements IDocumentsStorageRepository {
  private browserDevDocs: ArtemisDocumentRecord[] | null = null;

  async getDocument(libraryItemId: string): Promise<ArtemisDocumentRecord | null> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.documents?.get) {
        throw new Error('Artemis Documents IPC bridge is unavailable in Electron environment.');
      }
      return window.artemisAPI.documents.get(libraryItemId);
    }

    return this.browserDevGet(libraryItemId);
  }

  async updateDocumentContent(
    libraryItemId: string,
    content: Record<string, unknown>
  ): Promise<ArtemisDocumentRecord> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.documents?.updateContent) {
        throw new Error('Artemis Documents IPC bridge is unavailable in Electron environment.');
      }
      return window.artemisAPI.documents.updateContent(libraryItemId, content);
    }

    return this.browserDevUpdateContent(libraryItemId, content);
  }

  // ---------------------------------------------------------------------------
  // Browser Development-Only Helpers
  // ---------------------------------------------------------------------------

  private async browserDevLoad(): Promise<ArtemisDocumentRecord[]> {
    if (this.browserDevDocs === null) {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
        this.browserDevDocs = raw ? JSON.parse(raw) : [];
      } catch {
        this.browserDevDocs = [];
      }
    }
    return this.browserDevDocs || [];
  }

  private async browserDevSave(docs: ArtemisDocumentRecord[]): Promise<void> {
    this.browserDevDocs = [...docs];
    try {
      localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(docs));
    } catch (e) {
      console.warn('Browser localStorage save failed for documents:', e);
    }
  }

  private async browserDevGet(libraryItemId: string): Promise<ArtemisDocumentRecord> {
    const docs = await this.browserDevLoad();
    const existing = docs.find((d) => d.libraryItemId === libraryItemId);
    if (existing) {
      return existing;
    }

    const now = Date.now();
    const newDoc: ArtemisDocumentRecord = {
      libraryItemId,
      contentSchemaVersion: 1,
      content: DEFAULT_BROWSER_EMPTY_DOC,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    docs.push(newDoc);
    await this.browserDevSave(docs);
    return newDoc;
  }

  private async browserDevUpdateContent(
    libraryItemId: string,
    content: Record<string, unknown>
  ): Promise<ArtemisDocumentRecord> {
    const docs = await this.browserDevLoad();
    const index = docs.findIndex((d) => d.libraryItemId === libraryItemId);
    const now = Date.now();

    let updated: ArtemisDocumentRecord;
    if (index !== -1) {
      updated = {
        ...docs[index],
        content,
        revision: docs[index].revision + 1,
        updatedAt: now,
      };
      docs[index] = updated;
    } else {
      updated = {
        libraryItemId,
        contentSchemaVersion: 1,
        content,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };
      docs.push(updated);
    }

    await this.browserDevSave(docs);
    return updated;
  }
}

export const documentsRepository = new LocalDocumentsRepository();
