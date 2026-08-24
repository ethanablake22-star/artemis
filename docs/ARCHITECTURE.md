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
2. **Singleton Tab Types**: Special core utility views like **Home** and **Library** are singletons. Opening a singleton tab when one is already open will focus the existing tab rather than creating a duplicate.
3. **Immutability & Closability**: The initial **Artemis Home** tab is non-closable (`closable: false`), serving as the persistent mission control and workspace anchor.

---

## Artemis Subsystems

### 1. Artemis Home (`home`)
The persistent mission dashboard anchoring the workspace. Provides mission objectives, active work progress, calendar/dispatch schedule, recent files, and real-time notifications.

### 2. Artemis Library (`library`)
The universal, local-first file and asset browser subsystem.
- **Authoritative Main Process Boundary**: All data validation, cryptographic UUID generation (`crypto.randomUUID()`), recursive cascading soft-deletions, and atomic disk writes are executed strictly within the Electron Main Process.
- **Versioned Store Format**: Persisted using `{ "schemaVersion": 1, "items": [...] }` in `userData`.
- **Narrow IPC Surface**: Preload bridge only exposes granular operations (`list`, `get`, `create`, `update`, `move`, `delete`). Generic store replacement (`saveItems`) is disabled.
- **Strict Desktop Error Handling**: In desktop mode, IPC failures trigger visible errors instead of silently switching databases.
- **Navigation & Management**: Arbitrary folder nesting, interactive breadcrumbs, folder and placeholder document creation, renaming, and soft-deletion.

---

## Future Extensibility & Hosted Engines

The Artemis universal tab shell is decoupled from individual view engines. In future milestones, tabs may host diverse engines and environments, including:

- **Chromium Web Content**: Embedded WebViews / BrowserViews for full web browsing and SaaS integrations.
- **Artemis React Applications**: Native, high-performance modular React tool suites (Scheduling, Inventory, CRM, Automotive Service Management).
- **Document & Spreadsheet Editors (Artemis Docs - Task 003)**: Rich-text documents, markdown manuals, tables, and autosave.
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
