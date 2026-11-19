/**
 * Backup IPC remains deliberately narrow: renderer never supplies filesystem paths.
 * Restore is intentionally unavailable until transactional restore is implemented.
 */
export interface BackupOperationResult {
  canceled: boolean;
  /** User-chosen path to the backup or inspected archive. */
  path?: string;
  fileCount?: number;
  createdAt?: string;
}

export interface BackupBridge {
  export: () => Promise<BackupOperationResult>;
  verify: () => Promise<BackupOperationResult>;
}
