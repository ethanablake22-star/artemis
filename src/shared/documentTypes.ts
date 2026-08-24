export interface ArtemisDocumentRecord {
  /** Stable UUID of the associated Library item */
  libraryItemId: string;
  /** Schema version of the document content */
  contentSchemaVersion: 1;
  /** Canonical structured JSON representation of the document */
  content: Record<string, unknown>;
  /** Monotonically increasing revision number */
  revision: number;
  /** Document creation timestamp in milliseconds (epoch) */
  createdAt: number;
  /** Last update timestamp in milliseconds (epoch) */
  updatedAt: number;
}

export interface ArtemisDocumentsStoreData {
  schemaVersion: 1;
  documents: ArtemisDocumentRecord[];
}

export interface DocumentsBridge {
  get: (libraryItemId: string) => Promise<ArtemisDocumentRecord | null>;
  updateContent: (
    libraryItemId: string,
    content: Record<string, unknown>
  ) => Promise<ArtemisDocumentRecord>;
}

export interface IDocumentsStorageRepository {
  getDocument(libraryItemId: string): Promise<ArtemisDocumentRecord | null>;
  updateDocumentContent(
    libraryItemId: string,
    content: Record<string, unknown>
  ): Promise<ArtemisDocumentRecord>;
}
