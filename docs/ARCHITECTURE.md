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
  | 'schedule'
  | 'schedule-event'
  | 'automotive'
  | 'automotive-customer'
  | 'automotive-vehicle'
  | 'automotive-work-order'
  | 'automotive-estimate'
  | 'automotive-invoice'
  | 'automotive-payment';

export interface ArtemisTab {
  id: string;
  type: ArtemisTabType;
  title: string;
  resourceId?: string; // Stable UUID for bound resources (e.g. Documents, Customers, Vehicles, Work Orders, Estimates, Invoices, Payments, Events)
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
   - Singletons like **Home**, **Library**, **Automotive Hub**, and **Schedule & Calendar** are unique across the app.
   - Resource-bound tabs (**Documents**, **Customers**, **Vehicles**, **Work Orders**, **Estimates**, **Invoices**, **Payments**, **Schedule Events**) deduplicate by `tab.type + tab.resourceId`: opening an already open resource focuses the existing tab rather than spawning duplicates.
3. **Immutability & Closability**: The initial **Artemis Home** tab is non-closable (`closable: false`), serving as the persistent mission control and workspace anchor.
4. **Flush-on-Close Safety**: Document tabs register close hooks with `TabContext` to guarantee pending changes are flushed before unmounting, blocking closure if disk writes fail.

---

## Artemis Subsystems

### 1. Artemis Home (`home`)
The persistent operational command cockpit anchoring the workspace. Aggregates live data across subsystems:
- **Current Mission**: Focused hero card tracking the active Work Order, Schedule Appointment, or Document (`userData/artemis_home_store.json`).
- **Today's Schedule**: Real-time chronological appointments intersecting today in the local timezone.
- **Needs Attention**: Critical action items derived strictly from active Work Orders (`awaiting_approval`, `waiting_parts`, `diagnosing`).
- **Active Work**: Prioritized active repairs and diagnostics (`in_progress` > `diagnosing` > `awaiting_approval` > `waiting_parts` > `open`).
- **Recent Documents**: Authoritatively sorted recent structured documents from the Library.
- **Quick Access**: Direct creation shortcuts for Work Orders, Appointments, Documents, Customers, and Vehicles.
- **Fault-Isolated Loading**: Individual section loading errors do not blank or destabilize the rest of Home.

### 2. Artemis Library (`library`)
The universal, local-first file and asset browser subsystem.
- **Authoritative Main Process Boundary**: All data validation, cryptographic UUID generation (`crypto.randomUUID()`), recursive cascading soft-deletions, and atomic disk writes are executed strictly within the Electron Main Process.
- **Versioned Store Format**: Persisted using `{ "schemaVersion": 1, "items": [...] }` in `userData/artemis_library_store.json`.
- **Narrow IPC Surface**: Preload bridge only exposes granular operations (`list`, `get`, `create`, `update`, `move`, `delete`). Generic store replacement is disabled.
- **Navigation & Management**: Arbitrary folder nesting, interactive breadcrumbs, folder and placeholder document creation, renaming, and soft-deletion.

### 3. Artemis Docs (`document`)
The native structured rich-text document workspace.
- **TipTap / ProseMirror Engine**: Canonical structured JSON representation with headings (H1-H3), paragraphs, bold, italic, underline, strikethrough, highlight, bulleted/numbered lists, text alignment, blockquotes, horizontal rules, links, interactive tables, images, undo/redo, and keyboard shortcuts.
- **Authoritative Content Store**: Document bodies are stored separately from Library metadata in `userData/artemis_documents_store.json` with revision tracking, lazy initialization validation, and atomic writes.
- **Race-Safe Autosave & Flush**: Edit generation counter prevents stale status transitions, and tab closure flushes pending edits synchronously.
- **Business Essentials**: Integrated interactive tables (add/remove rows/cols), embedded images, hyperlinks, print stylesheet (`@media print`), and native PDF export.

### 4. Artemis Automotive (`automotive`, `automotive-customer`, `automotive-vehicle`, `automotive-work-order`, `automotive-estimate`, `automotive-invoice`, `automotive-payment`)
The operational backbone for automotive repair management, fleet tracking, customer history, commercial estimating, invoicing, and payment processing.
- **Authoritative Main Storage (Schema V6)**: Customers, Vehicles, Work Orders, Estimates, Invoices, and Payments stored in `userData/artemis_automotive_store.json` with atomic writes.
- **Human-Facing Non-Reusable Identifiers**: Monotonic sequential numbers generated in Main (`CUS-000001`, `VEH-000001`, `WO-000001`, `EST-000001`, `INV-000001`, `PAY-000001`). Numbers are never reused even if records are voided or deleted.
- **Separation of Concerns**:
  - Work Orders capture the technical repair record.
  - Estimates capture what was proposed to charge.
  - Invoices capture what was actually billed as an independent point-in-time financial record.
  - Payments record money received against issued invoices.
- **Integer-Cent Monetary Math**: 100% integer cent arithmetic with proportional discount, tax allocations, and balance tracking (see [docs/ESTIMATES.md](file:///home/EthanABlake/Projects/artemis/docs/ESTIMATES.md), [docs/INVOICES.md](file:///home/EthanABlake/Projects/artemis/docs/INVOICES.md), and [docs/PAYMENTS.md](file:///home/EthanABlake/Projects/artemis/docs/PAYMENTS.md)).
- **Approved Estimate, Issued Invoice, & Payment Protection**: Approved estimates and issued invoices are locked from ordinary mutations. Reopening an estimate is blocked while an active invoice exists. Invoices cannot exceed the approved source estimate total on issuance. Invoices cannot be voided if active posted payments exist against them.
- **Immutable Historical Snapshots**: Work Orders, Estimates, Invoices, and Payments preserve immutable customer name, address, phone, email, and vehicle snapshots captured at creation.
- **Independent Lifecycles**: Invoice lifecycle (`draft` / `issued` / `void`) remains distinct from derived payment status (`unpaid` / `partially_paid` / `paid`). Voiding a payment cleanly restores the invoice balance.

### 5. Artemis Scheduling & Calendar (`schedule`, `schedule-event`)
Native appointment scheduling, dispatch timelines, and service bookings.
- **Authoritative Main Storage (Schema V1)**: Stored in `userData/artemis_schedule_store.json` with sequential numbers (`EVT-000001`).
- **Time Model & Timezones**: Epoch millisecond timestamps (`startAt`, `endAt`) stored in UTC alongside IANA `timeZone` strings. All-day events span local calendar midnight to next local midnight.
- **Main-Enforced Relationship Consistency**: When a Work Order is linked, Main guarantees customer and vehicle relationships match the authoritative Work Order.
- **Live Overlap Detection**: Non-blocking interval intersection warnings (`existing.startAt < proposed.endAt && existing.endAt > proposed.startAt`) across active appointment statuses.
- **Interval Date Queries**: Range listings query overlapping intervals to render events that span into selected ranges.

---

## Security Architecture

Artemis adheres strictly to Electron security best practices:
- **`contextIsolation: true`**: The renderer process runs in an isolated context and does not have direct access to Node.js APIs.
- **`nodeIntegration: false`**: Node.js integration in the renderer is disabled to prevent remote code execution vulnerabilities.
- **Preload Context Bridge**: Communication between renderer and main process is explicitly restricted to sanitized, narrow IPC endpoints exposed via `contextBridge`.
