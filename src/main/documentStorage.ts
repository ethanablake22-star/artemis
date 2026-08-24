import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  ArtemisDocumentRecord,
  ArtemisDocumentsStoreData,
} from '../shared/documentTypes';
import { getItem } from './libraryStorage';

export const CURRENT_DOCUMENTS_SCHEMA_VERSION = 1;
const DOCUMENTS_STORE_FILENAME = 'artemis_documents_store.json';

export class UnsupportedDocumentsSchemaVersionError extends Error {
  constructor(public version: number) {
    super(`Unsupported documents schema version: ${version}. Please update Artemis.`);
    this.name = 'UnsupportedDocumentsSchemaVersionError';
  }
}

function getDocumentsStoreFilePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, DOCUMENTS_STORE_FILENAME);
}

const DEFAULT_EMPTY_DOC_CONTENT: Record<string, unknown> = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [],
    },
  ],
};

function validateAndMigrateDocumentsStore(raw: unknown): ArtemisDocumentsStoreData {
  if (!raw || typeof raw !== 'object') {
    return {
      schemaVersion: 1,
      documents: [],
    };
  }

  const obj = raw as Record<string, unknown>;
  const version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1;

  switch (version) {
    case 1: {
      const documents = Array.isArray(obj.documents)
        ? (obj.documents as ArtemisDocumentRecord[])
        : [];
      return {
        schemaVersion: 1,
        documents,
      };
    }
    default: {
      if (version > CURRENT_DOCUMENTS_SCHEMA_VERSION) {
        throw new UnsupportedDocumentsSchemaVersionError(version);
      }
      throw new UnsupportedDocumentsSchemaVersionError(version);
    }
  }
}

let inMemoryCache: ArtemisDocumentsStoreData | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function readDocumentsStoreFile(): Promise<ArtemisDocumentsStoreData> {
  if (inMemoryCache) {
    return inMemoryCache;
  }

  const filePath = getDocumentsStoreFilePath();
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const validated = validateAndMigrateDocumentsStore(parsed);
    inMemoryCache = validated;
    return validated;
  } catch (err: unknown) {
    if (err instanceof UnsupportedDocumentsSchemaVersionError) {
      throw err;
    }
    const initialStore: ArtemisDocumentsStoreData = {
      schemaVersion: 1,
      documents: [],
    };
    await writeDocumentsStoreFile(initialStore);
    inMemoryCache = initialStore;
    return initialStore;
  }
}

async function writeDocumentsStoreFile(store: ArtemisDocumentsStoreData): Promise<void> {
  inMemoryCache = store;

  writeQueue = writeQueue.then(async () => {
    const filePath = getDocumentsStoreFilePath();
    const tempPath = `${filePath}.tmp.${crypto.randomBytes(4).toString('hex')}`;
    const payload = JSON.stringify(store, null, 2);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tempPath, payload, 'utf-8');
    await fs.rename(tempPath, filePath);
  }).catch((err) => {
    console.error('Failed to write documents store to disk:', err);
    throw err;
  });

  return writeQueue;
}

// -----------------------------------------------------------------------------
// Authoritative Document Operations
// -----------------------------------------------------------------------------

/**
 * Retrieves or lazily initializes a document record.
 * Validates that the referenced Library item exists, is type === 'document', and isDeleted === false.
 */
export async function getDocument(libraryItemId: string): Promise<ArtemisDocumentRecord> {
  if (!libraryItemId || typeof libraryItemId !== 'string') {
    throw new Error('Invalid libraryItemId provided');
  }

  // 1. Authoritative Library Validation: item must exist, be a document, and not be deleted
  const libraryItem = await getItem(libraryItemId);
  if (!libraryItem) {
    throw new Error(`Library item "${libraryItemId}" does not exist`);
  }

  if (libraryItem.type !== 'document') {
    throw new Error(`Library item "${libraryItemId}" is a ${libraryItem.type}, not a document`);
  }

  if (libraryItem.isDeleted) {
    throw new Error(`Cannot open document "${libraryItemId}": item is deleted`);
  }

  // 2. Lookup existing document record in store
  const store = await readDocumentsStoreFile();
  const existing = store.documents.find((doc) => doc.libraryItemId === libraryItemId);
  if (existing) {
    return existing;
  }

  // 3. Lazy Initialization: Authoritative creation in Main with atomic persistence
  const now = Date.now();
  const newRecord: ArtemisDocumentRecord = {
    libraryItemId,
    contentSchemaVersion: 1,
    content: DEFAULT_EMPTY_DOC_CONTENT,
    revision: 1,
    createdAt: now,
    updatedAt: now,
  };

  store.documents.push(newRecord);
  await writeDocumentsStoreFile(store);
  return newRecord;
}

/**
 * Authoritatively updates document content.
 * Rejects updates if the referenced Library item is missing, not a document, or deleted.
 */
export async function updateDocumentContent(
  libraryItemId: string,
  content: Record<string, unknown>
): Promise<ArtemisDocumentRecord> {
  if (!libraryItemId || typeof libraryItemId !== 'string') {
    throw new Error('Invalid libraryItemId provided');
  }

  if (!content || typeof content !== 'object') {
    throw new Error('Document content must be a valid structured JSON object');
  }

  // 1. Authoritative Library Validation
  const libraryItem = await getItem(libraryItemId);
  if (!libraryItem) {
    throw new Error(`Cannot update document: Library item "${libraryItemId}" not found`);
  }

  if (libraryItem.type !== 'document') {
    throw new Error(`Cannot update document: Library item "${libraryItemId}" is not a document`);
  }

  if (libraryItem.isDeleted) {
    throw new Error(`Cannot update document "${libraryItemId}": item is deleted`);
  }

  // 2. Update record in document store
  const store = await readDocumentsStoreFile();
  const index = store.documents.findIndex((doc) => doc.libraryItemId === libraryItemId);
  const now = Date.now();

  let updatedRecord: ArtemisDocumentRecord;

  if (index !== -1) {
    const existing = store.documents[index];
    updatedRecord = {
      ...existing,
      content,
      revision: existing.revision + 1,
      updatedAt: now,
    };
    store.documents[index] = updatedRecord;
  } else {
    updatedRecord = {
      libraryItemId,
      contentSchemaVersion: 1,
      content,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
    store.documents.push(updatedRecord);
  }

  await writeDocumentsStoreFile(store);
  return updatedRecord;
}
