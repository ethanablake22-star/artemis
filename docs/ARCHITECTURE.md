# Artemis Universal Tab & Platform Architecture

## Core Architectural Principle

> **Fundamental Rule:**
> **Almost every user-facing activity in Artemis opens inside an Artemis tab. The tab shell is independent of the engine or application hosted inside that tab.**

Artemis is designed as a universal desktop workspace. Rather than isolating tools into disconnected windows or disparate applications, Artemis unifies operations into a centralized, modern tabbed shell built on Electron, React, and TypeScript.

---

## Universal Tab Model

Every tab in Artemis is represented internally by a standardized `ArtemisTab` model:

```typescript
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
  id: string;
  type: ArtemisTabType;
  title: string;
  resourceId?: string; // Stable UUID for bound resources (e.g. Library documents)
  icon?: string;
  closable: boolean;
  state?: Record<string, unknown>;
  metadata?: {
    path?: string;
    url?: string;
    unsavedChanges?: boolean;
    createdAt?: number;
    lastActiveAt?: number;
  };
}
```

### Tab Lifecycle & Singleton Rules
1. **Shell Independence**: The top-level tab shell governs window lifecycle, navigation, tab selection, reordering, and closure. The shell does not concern itself with the internal business logic of the hosted view.
2. **Singleton & Resource Deduplication**:
   - Singletons like **Home** and **Library** are unique across the app.
   - Resource-bound tabs (such as **Documents**) deduplicate by `resourceId`: opening an already open document focuses the existing tab rather than spawning duplicates.
3. **Immutability & Closability**: The initial **Artemis Home** tab is non-closable (`closable: false`), serving as the persistent mission control and workspace anchor.
4. **Flush-on-Close Safety**: Document tabs register close hooks with `TabContext` to guarantee pending changes are flushed before unmounting, blocking closure if disk writes fail.

---

## Artemis Subsystems

### 1. Artemis Home (`home`)
The persistent mission dashboard anchoring the workspace. Provides mission objectives, active work progress, calendar/dispatch schedule, recent files, and real-time notifications.

### 2. Artemis Library (`library`)
The universal, local-first file and asset browser subsystem.
- **Authoritative Main Process Boundary**: All data validation, cryptographic UUID generation (`crypto.randomUUID()`), recursive cascading soft-deletions, and atomic disk writes are executed strictly within the Electron Main Process.
- **Versioned Store Format**: Persisted using `{ "schemaVersion": 1, "items": [...] }` in `userData`.
- **Narrow IPC Surface**: Preload bridge only exposes granular operations (`list`, `get`, `create`, `update`, `move`, `delete`). Generic store replacement is disabled.
- **Navigation & Management**: Arbitrary folder nesting, interactive breadcrumbs, folder and placeholder document creation, renaming, and soft-deletion.

### 3. Artemis Docs (`document`)
The native structured rich-text document workspace.
- **TipTap / ProseMirror Engine**: Canonical structured JSON representation with headings (H1-H3), paragraphs, bold, italic, underline, strikethrough, bulleted/numbered lists, text alignment, blockquotes, undo/redo, and keyboard shortcuts.
- **Authoritative Content Store**: Document bodies are stored separately from Library metadata in `userData/artemis_documents_store.json` with revision tracking, lazy initialization validation, and atomic writes.
- **Race-Safe Autosave & Flush**: Edit generation counter prevents stale status transitions, and tab closure flushes pending edits synchronously.
- **Interoperability Roadmap**: Future milestones will add tables, images, printing, and DOCX/PDF export.

---

## Future Extensibility & Hosted Engines

The Artemis universal tab shell is decoupled from individual view engines. In future milestones, tabs may host diverse engines and environments, including:

- **Chromium Web Content**: Embedded WebViews / BrowserViews for full web browsing and SaaS integrations.
- **Artemis React Applications**: Native, high-performance modular React tool suites (Scheduling, Inventory, CRM, Automotive Service Management).
- **Spreadsheet Editors**: Tabular calculation and ledger workspaces.
- **Monaco & Code Environments**: Full-featured code editor with syntax highlighting, language servers, and git integration.
- **CAD & 3D Engines**: WebGL/WebGPU parametric 3D modeling and rendering environments.
- **PCB Tools**: Interactive electronic schematic and PCB layout design canvas.
- **Terminals & Consoles**: Embedded xterm.js terminal instances and CLI environments.
- **Document Viewers**: Hardware-accelerated PDF, Gerber, and vector viewers.

---

## Security Architecture

Artemis adheres strictly to Electron security best practices:
- **`contextIsolation: true`**: The renderer process runs in an isolated context and does not have direct access to Node.js APIs.
- **`nodeIntegration: false`**: Node.js integration in the renderer is disabled to prevent remote code execution vulnerabilities.
- **Preload Context Bridge**: Communication between renderer and main process is explicitly restricted to sanitized, narrow IPC endpoints exposed via `contextBridge`.
