import { app, BrowserWindow, dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { BackupOperationResult } from '../shared/backupTypes';

/**
 * V0.0.11: Portable, read-only export and verification of known Artemis stores.
 * Data is intentionally NOT imported or restored by this module.
 *
 * WARNING: Backups contain plaintext business/customer records. Keep secure.
 */
const BACKUP_FORMAT = 'artemis-backup';
const BACKUP_FORMAT_VERSION = 1;
const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;
const STORE_FILES = [
  'artemis_library_store.json',
  'artemis_documents_store.json',
  'artemis_automotive_store.json',
  'artemis_schedule_store.json',
  'artemis_home_store.json',
] as const;

type StoreFileName = (typeof STORE_FILES)[number];

interface BackupFile {
  name: StoreFileName;
  sha256: string;
  content: string;
}

interface ArtemisBackupArchive {
  format: typeof BACKUP_FORMAT;
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  createdAt: string;
  appVersion: string;
  files: BackupFile[];
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function assertObject(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(name + ' must be a JSON object.');
  }
}

function validateStoreData(name: string, content: string): void {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error(name + ' is not valid JSON.');
  }
  assertObject(data, name);
  if (!Number.isInteger(data.schemaVersion) || (data.schemaVersion as number) < 1) {
    throw new Error(name + ' has an invalid schema version.');
  }
  const requiredCollection: Record<string, string | null> = {
    'artemis_library_store.json': 'items',
    'artemis_documents_store.json': 'documents',
    'artemis_automotive_store.json': 'customers',
    'artemis_schedule_store.json': 'events',
    'artemis_home_store.json': null,
  };
  const collection = requiredCollection[name];
  if (collection && !Array.isArray(data[collection])) {
    throw new Error(name + ' is missing its ' + collection + ' array.');
  }
}

/** Checks that each file is known, well-formed, and unchanged since export. */
export function validateBackupArchive(raw: unknown): ArtemisBackupArchive {
  assertObject(raw, 'Backup archive');
  if (raw.format !== BACKUP_FORMAT || raw.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error('Unsupported Artemis backup format or version.');
  }
  if (typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt))) {
    throw new Error('Backup creation timestamp is invalid.');
  }
  if (typeof raw.appVersion !== 'string' || !Array.isArray(raw.files)
    || raw.files.length === 0 || raw.files.length > STORE_FILES.length) {
    throw new Error('Backup manifest is incomplete.');
  }
  const names = new Set<string>();
  for (const entry of raw.files) {
    assertObject(entry, 'Backup entry');
    if (typeof entry.name !== 'string' || !STORE_FILES.includes(entry.name as StoreFileName)) {
      throw new Error('Backup includes an unexpected data store.');
    }
    if (names.has(entry.name)) {
      throw new Error('Backup contains the same data store more than once.');
    }
    names.add(entry.name);
    if (typeof entry.content !== 'string' || typeof entry.sha256 !== 'string'
      || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      throw new Error('Backup entry is malformed: ' + entry.name);
    }
    if (sha256(entry.content) !== entry.sha256) {
      throw new Error('Backup checksum mismatch: ' + entry.name);
    }
    validateStoreData(entry.name, entry.content);
  }
  return raw as unknown as ArtemisBackupArchive;
}

async function captureStores(): Promise<BackupFile[]> {
  const directory = app.getPath('userData');
  const files: BackupFile[] = [];
  for (const name of STORE_FILES) {
    let content: string;
    try {
      content = await fs.readFile(path.join(directory, name), 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    // A corrupt store must never be silently skipped.
    validateStoreData(name, content);
    files.push({ name, content, sha256: sha256(content) });
  }
  if (!files.length) {
    throw new Error('No Artemis data stores found. Open Artemis and create or load data first.');
  }
  return files;
}

export async function exportArtemisBackup(parent: BrowserWindow): Promise<BackupOperationResult> {
  const date = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog(parent, {
    title: 'Export Artemis Backup',
    buttonLabel: 'Create Backup',
    defaultPath: 'Artemis-' + date + '.artemis-backup.json',
    filters: [{ name: 'Artemis Backup', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { canceled: true };

  const archive: ArtemisBackupArchive = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    files: await captureStores(),
  };
  validateBackupArchive(archive);
  const serialized = JSON.stringify(archive, null, 2);
  if (Buffer.byteLength(serialized, 'utf8') > MAX_ARCHIVE_BYTES) {
    throw new Error('Backup is too large for this exporter.');
  }

  // Stage alongside the destination so an interrupted export does not leave a
  // truncated backup at the user-selected location.
  const tempPath = filePath + '.' + randomUUID() + '.tmp';
  try {
    await fs.writeFile(tempPath, serialized, { encoding: 'utf8', flag: 'wx' });
    const staged = await fs.readFile(tempPath, 'utf8');
    validateBackupArchive(JSON.parse(staged));
    await fs.rename(tempPath, filePath);
    // Verify the actual on-disk destination before reporting success.
    validateBackupArchive(JSON.parse(await fs.readFile(filePath, 'utf8')));
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
  }
  return {
    canceled: false,
    path: filePath,
    createdAt: archive.createdAt,
    fileCount: archive.files.length,
  };
}

export async function verifyArtemisBackup(parent: BrowserWindow): Promise<BackupOperationResult> {
  const { canceled, filePaths } = await dialog.showOpenDialog(parent, {
    title: 'Verify Artemis Backup',
    buttonLabel: 'Verify Backup',
    properties: ['openFile'],
    filters: [{ name: 'Artemis Backup', extensions: ['json'] }],
  });
  if (canceled || !filePaths.length) return { canceled: true };
  const filePath = filePaths[0];
  const { size } = await fs.stat(filePath);
  if (size > MAX_ARCHIVE_BYTES) throw new Error('Backup exceeds the supported size limit.');
  let raw: unknown;
  try {
    raw = JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    throw new Error('This file is not a valid Artemis backup JSON file.');
  }
  const archive = validateBackupArchive(raw);
  return {
    canceled: false,
    path: filePath,
    createdAt: archive.createdAt,
    fileCount: archive.files.length,
  };
}
