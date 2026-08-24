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

export interface ExportPdfResult {
  success: boolean;
  filePath?: string;
  canceled?: boolean;
  error?: string;
}

export interface DocumentsBridge {
  get: (libraryItemId: string) => Promise<ArtemisDocumentRecord>;
  updateContent: (
    libraryItemId: string,
    content: Record<string, unknown>
  ) => Promise<ArtemisDocumentRecord>;
  exportPDF: (defaultTitle?: string) => Promise<ExportPdfResult>;
}

export interface IDocumentsStorageRepository {
  getDocument(libraryItemId: string): Promise<ArtemisDocumentRecord>;
  updateDocumentContent(
    libraryItemId: string,
    content: Record<string, unknown>
  ): Promise<ArtemisDocumentRecord>;
  exportPDF(defaultTitle?: string): Promise<ExportPdfResult>;
}
