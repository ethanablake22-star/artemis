# Artemis Scheduling & Calendar Subsystem (V0.0.6)

## Overview

The Artemis **Scheduling & Calendar** subsystem provides native appointment scheduling, service timeline tracking, and dispatch operations for automotive and business workflows within the Universal Tab Shell.

It operates with authoritative Electron Main process persistence, sequential human-facing event identifiers (`EVT-000001`), DST-safe epoch millisecond intervals with IANA timezones, relationship integrity with Automotive resources (Work Orders, Vehicles, Customers), and non-blocking conflict/overlap detection.

```text
Artemis Workspace
       ↓
Schedule & Calendar (Tab type: 'schedule')
       ├── Today View
       ├── Week View
       └── Month View
             ↓ click event
[ EVT-000001 — Brake Service Intake ] (Tab type: 'schedule-event')
       ├── Date, Time Window & Duration
       ├── Linked Work Order (WO-000001)
       ├── Linked Vehicle (2006 Mercedes SL500)
       └── Linked Customer (Ethan Blake)
```

---

## 1. Data Model & Representation

Authoritative records are stored in `app.getPath('userData')/artemis_schedule_store.json`.

```typescript
export type ScheduleEventType =
  | 'service'
  | 'diagnostic'
  | 'inspection'
  | 'dropoff'
  | 'pickup'
  | 'parts'
  | 'meeting'
  | 'admin'
  | 'other';

export type ScheduleEventStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface ScheduleEventRecord {
  id: string; // UUID
  eventNumber: string; // Sequential monotonic identifier (e.g. EVT-000001)
  title: string;
  type: ScheduleEventType;
  status: ScheduleEventStatus;

  /** UTC epoch timestamp in milliseconds */
  startAt: number;
  /** UTC epoch timestamp in milliseconds (exclusive boundary for all-day events) */
  endAt: number;
  /** Whether the event spans entire calendar days */
  allDay: boolean;
  /** IANA timezone identifier (e.g. "America/New_York", "UTC") */
  timeZone: string;

  /** Optional linked Customer UUID */
  customerId: string | null;
  /** Optional linked Vehicle UUID */
  vehicleId: string | null;
  /** Optional linked Work Order UUID */
  workOrderId: string | null;

  location?: string;
  notes?: string;

  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}
```

### Time Representation & Timezones (DST-Safe)
- `startAt` and `endAt` are stored as **UTC epoch milliseconds**.
- Each event stores an IANA `timeZone` string (e.g. `"America/New_York"`).
- **All-day events**: represent local calendar-day boundaries in the event's `timeZone`, with `endAt` exclusive.
  - A 1-day all-day event begins at local midnight of the selected date and ends at local midnight of the following calendar date.
  - Depending on DST transitions (Spring forward vs Fall back), a local calendar day can represent 23, 24, or 25 elapsed hours ($82{,}800{,}000\text{ ms}$, $86{,}400{,}000\text{ ms}$, or $90{,}000{,}000\text{ ms}$). Artemis does NOT assume exactly 86,400,000 ms.
  - Multi-day all-day events span from local midnight of the start date to local midnight of the day following the end date.
- **Timed events**: `endAt` must be strictly greater than `startAt` (`endAt > startAt`).

---

## 2. Main-Process Authoritative Validation & Relationships

### Work Order Consistency
When `workOrderId` is provided during event creation or update:
1. Electron Main retrieves the active Work Order record.
2. Main derives and guarantees consistency:
   - `vehicleId` must correspond to `workOrder.vehicleId`.
   - `customerId` must correspond to `workOrder.customerId`.
3. If conflicting IDs are supplied by the renderer, the mutation is rejected.

### Historical Editing Integrity
- On event creation: newly selected Customer, Vehicle, or Work Order must be active (`isDeleted === false`).
- On event update: existing Schedule events remain fully editable (for title, status, timestamps, notes) even if an already-linked resource was subsequently archived. Relationship validity is only re-verified if the relationship ID itself is being altered.

### Non-Cascading Deletion
- Deleting an event performs a soft-delete (`isDeleted = true`).
- Deleting a customer, vehicle, or work order never cascades into deleting scheduled events.

---

## 3. Conflict & Overlap Detection

Artemis performs live, non-blocking interval intersection checks:

$$\text{existing.startAt} < \text{proposed.endAt} \quad \land \quad \text{existing.endAt} > \text{proposed.startAt}$$

### Conflict-Producing Statuses
- `scheduled`
- `confirmed`
- `in_progress`

### Ignored Statuses
- `completed`
- `cancelled`
- `no_show`

When updating an existing event, that event's own ID (`excludeEventId`) is excluded from the query so an event does not conflict with itself. All-day events participate in the same interval logic using their midnight-to-midnight interval.

---

## 4. Date-Range Queries

Date-range queries for Today, Week, and Month views use interval overlap semantics rather than point-in-time checks:

$$\text{event.startAt} < \text{rangeEnd} \quad \land \quad \text{event.endAt} > \text{rangeStart}$$

This guarantees that multi-hour or multi-day events beginning before a visible view range and ending within it are correctly rendered.

---

## 5. Universal Tab Architecture Integration

- **Schedule Hub Tab**: `type: 'schedule'`, singleton tab (`openScheduleTab()`).
- **Schedule Event Tab**: `type: 'schedule-event'`, `resourceId: eventId`, deduplicated by `tab.type + tab.resourceId` (`openScheduleEventTab(id, title)`).
- **Automotive Cross-Links**:
  - From Work Order: `+ Schedule Appointment` button pre-fills WO, vehicle, and customer; displays linked appointments.
  - From Vehicle: Displays upcoming vehicle appointments.
  - From Customer: Displays upcoming customer appointments.
  - From Automotive Hub: Displays `TODAY'S SCHEDULE` dispatch strip.
