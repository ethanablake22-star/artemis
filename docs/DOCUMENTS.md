# Artemis Docs Architecture & Data Model

## Overview

**Artemis Docs** is the native structured rich-text document editing subsystem for the Artemis desktop platform. It provides an intuitive, high-performance workspace for drafting, reading, and maintaining critical company documentation, operating agreements, legal filings, technical specifications, automotive repair procedures, and internal manuals directly inside Artemis universal tabs.

---

## Relationship Between Library & Document Subsystems

In Artemis, **metadata** and **document body content** are decoupled:

- **Library Item (`LibraryItem`)**: Stored in `artemis_library_store.json`. Contains item metadata, display name, folder hierarchy parent pointer (`parentId`), timestamps, and soft-deletion state.
- **Document Content (`ArtemisDocumentRecord`)**: Stored authoritatively in `artemis_documents_store.json`. Contains the structured JSON document body, content schema version, and revision counter.
- **Universal Tab Integration**: When a document is opened from the Library (or search/launcher), an `ArtemisTab` is spawned with:
  - `type: 'document'`
  - `resourceId: string` (references the Library item's stable UUID)
  - `title: string` (synchronized with the Library item name)

```
┌────────────────────────────────────────────────────────┐
│                      Library Item                      │
│   id: "d-corp-structure-uuid"                          │
│   name: "Corporate Structure.doc"                      │
│   type: "document"                                     │
│   parentId: "f-legal-folder-uuid"                      │
└───────────────────────────┬────────────────────────────┘
                            │
               referenced by resourceId
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Universal Tab                       │
│   id: "tab-doc-..."                                    │
│   type: "document"                                     │
│   resourceId: "d-corp-structure-uuid"                  │
│   title: "Corporate Structure.doc"                     │
└───────────────────────────┬────────────────────────────┘
                            │
               loads & autosaves content
                            │
┌───────────────────────────▼────────────────────────────┐
│              Artemis Document Record                   │
│   libraryItemId: "d-corp-structure-uuid"               │
│   contentSchemaVersion: 1                              │
│   content: { type: "doc", content: [...] }             │
│   revision: 42                                         │
└────────────────────────────────────────────────────────┘
```

### Soft-Deletion & Read/Save Validation Rules
1. **Rejection of Deleted Documents**: `getDocument()` and `updateDocumentContent()` strictly verify that the referenced Library item exists, has `type === 'document'`, and `isDeleted === false`. If the item is soft-deleted, opening or updating the document is rejected.
2. **Preservation Invariant**: When a Library item is soft-deleted, its corresponding document body record remains untouched on disk in `artemis_documents_store.json`. This ensures complete data recovery when restoring items from Trash in future milestones.

---

## Canonical Structured Content Format (TipTap / ProseMirror)

Artemis Docs stores a canonical structured JSON document tree (`ProseMirror` / `TipTap` JSON representation) with `contentSchemaVersion: 1`.

```typescript
export interface ArtemisDocumentRecord {
  /** Stable UUID of the associated Library item */
  libraryItemId: string;
  /** Content schema version */
  contentSchemaVersion: 1;
  /** Canonical structured JSON representation of the document */
  content: Record<string, unknown>;
  /** Monotonically increasing revision counter */
  revision: number;
  /** Creation timestamp in milliseconds (epoch) */
  createdAt: number;
  /** Last update timestamp in milliseconds (epoch) */
  updatedAt: number;
}

export interface ArtemisDocumentsStoreData {
  schemaVersion: 1;
  documents: ArtemisDocumentRecord[];
}
```

### Supported Document Elements (Business Essentials V0.0.3.1)
- **Hierarchy & Text**: Paragraphs, Heading 1, Heading 2, Heading 3.
- **Character Marks**: Bold (`Ctrl+B`), Italic (`Ctrl+I`), Underline (`Ctrl+U`), Strikethrough, Highlight (`mark`).
- **Alignment**: Left, Center, Right text alignment.
- **Lists & Quotes**: Bulleted lists, numbered lists, blockquotes, horizontal dividers (`hr`).
- **Hyperlinks**: Interactive web links with automatic protocol normalization (`https://`).
- **Interactive Tables**:
  - Resizable column tables with header row formatting.
  - Context operations: Insert 3×3, Add/Delete Row, Add/Delete Column, Toggle Header, Delete Table.
- **Images**: Local image upload (base64 standalone embedding) and web image URLs.
- **Print & PDF Export**:
  - High-fidelity print styles (`@media print`) that strip all application chrome.
  - Electron native PDF export (`artemisAPI.documents.exportPDF`) via `webContents.printToPDF` and system save dialog.

---

## Authoritative Persistence & Narrow IPC

The Electron Main Process is authoritative for loading, initializing, mutating, and exporting document records.

### Narrow IPC Operations
- `artemisAPI.documents.get(libraryItemId)`: Retrieves or lazily initializes the document content record.
- `artemisAPI.documents.updateContent(libraryItemId, content)`:
  1. Validates `libraryItemId` against authoritative Library records (verifies item exists, is `type: 'document'`, and `isDeleted === false`).
  2. Validates `content` is a non-null object.
  3. Increments `revision` counter.
  4. Updates `updatedAt` timestamp.
  5. Performs an atomic file write via temporary file swap to `app.getPath('userData')/artemis_documents_store.json`.
- `artemisAPI.documents.exportPDF(defaultTitle)`: Prompts user with save dialog and exports the active document as a standalone PDF.

---

## Race-Safe Autosave & Flush-on-Close Lifecycle

1. **Typing & Generation Tracking**: As the user types or applies formatting, TipTap triggers an `onUpdate` event which increments a local edit generation counter (`editGenerationRef`).
2. **Debounce (700ms)**: Autosave is debounced to capture changes immediately after pauses without thrashing disk writes.
3. **Race-Safe Status Transition**: When an asynchronous save completes, the status only switches to `Saved` if no newer edits occurred while the save was in flight (`editGenerationRef === savedGenerationRef`). If newer edits occurred, status remains `Saving…` until the newest generation is persisted.
4. **Flush Before Tab Close**: Before a document tab closes, `TabContext` triggers the registered `beforeClose` handler. If unsaved edits exist, an immediate flush is performed. If the save succeeds, the tab closes; if the save fails, **the tab remains open and surfaces the Save error** to prevent data loss.

---

## Planned Interoperability (Roadmap)

- **Task 003.2**: Page layout modes (Letter / A4), custom margin controls, and headers/footers.
- **Task 003.3**: Lossless DOCX import/export engine.
