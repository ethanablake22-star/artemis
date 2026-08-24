# Artemis Docs Architecture & Data Model

## Overview

**Artemis Docs** is the native structured rich-text document editing subsystem for the Artemis desktop platform. It provides an intuitive, high-performance workspace for drafting, reading, and maintaining critical company documentation, operating agreements, legal filings, technical specifications, and internal manuals directly inside Artemis universal tabs.

---

## Relationship Between Library & Document Subsystems

In Artemis, **metadata** and **document body content** are deliberately decoupled:

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
│   name: "Operating Agreement.doc"                      │
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
│   title: "Operating Agreement.doc"                     │
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

## Canonical Structured Content Format

Artemis Docs does **not** use DOCX or raw plain text as its internal canonical format. Instead, it stores a structured JSON document tree (`ProseMirror` / `TipTap` JSON representation).

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

### Read-or-Initialize Semantics
When `artemisAPI.documents.get(libraryItemId)` is called:
1. The Electron Main process verifies the Library item exists, has `type === 'document'`, and is not deleted.
2. If a document body record already exists in `artemis_documents_store.json`, it is returned.
3. If no document body record exists yet, the Main process lazily initializes a default empty structured document with `revision: 1`, persists it atomically to disk, and returns the newly seeded record.

---

## Authoritative Persistence & Narrow IPC

The Electron Main Process is authoritative for loading and mutating document records.

### Narrow IPC Operations
- `artemisAPI.documents.get(libraryItemId)`: Retrieves or initializes the document content record.
- `artemisAPI.documents.updateContent(libraryItemId, content)`:
  1. Validates `libraryItemId` against authoritative Library records (verifies item exists, is `type: 'document'`, and `isDeleted === false`).
  2. Validates `content` is a non-null object.
  3. Increments `revision` counter.
  4. Updates `updatedAt` timestamp.
  5. Performs an atomic file write via temporary file swap to `app.getPath('userData')/artemis_documents_store.json`.

---

## Race-Safe Autosave & Flush-on-Close Lifecycle

1. **Typing & Generation Tracking**: As the user types or applies formatting, TipTap triggers an `onUpdate` event which increments a local edit generation counter (`editGenerationRef`).
2. **Debounce (700ms)**: Autosave is debounced to capture changes immediately after pauses without thrashing disk writes.
3. **Race-Safe Status Transition**: When an asynchronous save completes, the status only switches to `Saved` if no newer edits occurred while the save was in flight (`editGenerationRef === savedGenerationRef`). If newer edits occurred, status remains `Saving…` until the newest generation is persisted.
4. **Flush Before Tab Close**: Before a document tab closes, `TabContext` triggers the registered `beforeClose` handler. If unsaved edits exist, an immediate flush is performed. If the save succeeds, the tab closes; if the save fails, **the tab remains open and surfaces the Save error** to prevent data loss.

---

## Tab Deduplication & Navigation

- **Single Instance per Document**: If a document is already open in an active tab, double-clicking it in the Library or selecting it from launcher focuses the existing tab rather than opening a redundant duplicate.
- **Closing Document Tabs**: Closing a tab unmounts the editor without affecting the underlying Library item or document content record.
- **Title Synchronization**: Renaming a document from either the Library or the Docs header bar immediately synchronizes both the Library item record and the open tab title.

---

## Planned Interoperability (Roadmap)

- **Task 003.1**: Tables, images, callout boxes, and links.
- **Task 003.2**: Page layout modes, header/footer configuration, margins, and print stylesheet.
- **Task 003.3**: Lossless DOCX import/export engine and high-fidelity PDF rendering.
