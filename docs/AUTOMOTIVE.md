# Artemis Automotive Architecture & Data Model (Schema V3)

## Overview

**Artemis Automotive** is the native customer relationship management, vehicle fleet tracking, and service work order subsystem for the Artemis desktop platform. It provides an operational foundation for mechanic shops, fleet operators, and engineering teams to maintain customer accounts, vehicle profiles, VINs, mileage records, powertrain specifications, and repair work orders directly within Artemis universal tabs.

---

## Data Models & Entity Relationships (Schema V3)

Automotive data is authoritatively stored, validated, numbered, and snapshot-preserved in the Electron Main Process:

```
┌────────────────────────────────────────────────────────┐
│                    CustomerRecord                      │
│   id: "cust-uuid-..." (Immutable UUID)                 │
│   customerNumber: "CUS-000001" (Authoritative Monotonic)│
│   type: "individual" | "business"                      │
│   name: "Ethan Blake" (Main-synchronized display name) │
│   firstName: "Ethan", lastName: "Blake"                │
│   businessName?: "Apex Performance LLC"                │
│   contactPerson?: "Fleet Operations"                   │
│   phone: "(555) 019-2834"                              │
│   email: "ethan@example.com"                           │
│   address: "123 Industrial Way"                        │
│   notes: "Prefers Motul fluids"                        │
│   isDeleted: false                                     │
└───────────────────────────┬────────────────────────────┘
                            │
              1 to Many Ownership (Optional / Nullable)
                            │
┌───────────────────────────▼────────────────────────────┐
│                    VehicleRecord                       │
│   id: "veh-uuid-..." (Immutable UUID)                  │
│   vehicleNumber: "VEH-000001" (Authoritative Monotonic)│
│   customerId: "cust-uuid-..." | null (Unassigned/Shop) │
│   year?: 2006 (Optional)                               │
│   make: "Mercedes", model: "SL500", trim: "AMG Sport"  │
│   engine: "5.0L V8 M113"                               │
│   transmission: "722.9 7-Speed Automatic"              │
│   drivetrain: "RWD"                                    │
│   vin?: "WDBSK75F76F..." (Globally Unique, Uppercase)  │
│   licensePlate: "7XYZ123"                              │
│   mileage: 64250                                       │
│   color: "Obsidian Black"                              │
│   notes: "ABC suspension serviced"                     │
│   isDeleted: false                                     │
└───────────────────────────┬────────────────────────────┘
                            │
              1 to Many Service History Events
                            │
┌───────────────────────────▼────────────────────────────┐
│                   WorkOrderRecord                      │
│   id: "wo-uuid-..." (Immutable UUID)                   │
│   workOrderNumber: "WO-000001" (Authoritative Monotonic)│
│   vehicleId: "veh-uuid-..." (FK)                       │
│   customerId: "cust-uuid-..." | null (FK or null)      │
│   customerNameSnapshot?: "Ethan Blake" (Immutable)     │
│   vehicleDescriptionSnapshot: "2006 Mercedes SL500"    │
│   vinSnapshot?: "WDBSK75F76F..." (Immutable)           │
│   status: "open" | "diagnosing" | "completed" | ...    │
│   odometerIn?: 64250, odometerOut?: 64262              │
│   customerConcern: "ABC warning light illuminated"     │
│   inspectionNotes?: "Tandem pump pressure tested"      │
│   diagnosis?: "Valve block seals leaking"              │
│   workPerformed?: "Rebuilt front ABC valve block"      │
│   technicianNotes?: "Road tested 12 mi, level stable"  │
│   laborLines: [ { id, description, hours, notes } ]    │
│   partLines: [ { id, description, partNumber, qty } ]  │
│   openedAt: 1787692000000, completedAt?: ...           │
│   isDeleted: false                                     │
└────────────────────────────────────────────────────────┘
```

### TypeScript Definitions
```typescript
export type WorkOrderStatus =
  | 'draft'
  | 'open'
  | 'diagnosing'
  | 'awaiting_approval'
  | 'waiting_parts'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface WorkOrderLaborLine {
  id: string;
  description: string;
  hours?: number;
  notes?: string;
}

export interface WorkOrderPartLine {
  id: string;
  description: string;
  partNumber?: string;
  quantity: number;
  notes?: string;
}

export interface WorkOrderRecord {
  id: string;
  workOrderNumber: string; // WO-000001
  vehicleId: string;
  customerId: string | null;
  customerNameSnapshot?: string; // Captured at creation
  vehicleDescriptionSnapshot: string; // Captured at creation
  vinSnapshot?: string; // Captured at creation
  status: WorkOrderStatus;
  odometerIn?: number;
  odometerOut?: number;
  customerConcern: string;
  inspectionNotes?: string;
  diagnosis?: string;
  workPerformed?: string;
  technicianNotes?: string;
  laborLines: WorkOrderLaborLine[];
  partLines: WorkOrderPartLine[];
  openedAt: number;
  completedAt?: number;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}

export interface ArtemisAutomotiveStoreData {
  schemaVersion: 3;
  nextCustomerSequence: number;
  nextVehicleSequence: number;
  nextWorkOrderSequence: number;
  customers: CustomerRecord[];
  vehicles: VehicleRecord[];
  workOrders: WorkOrderRecord[];
}
```

---

## Architectural Guarantees & Invariants

1. **Historical Snapshot Integrity**:
   - A Work Order is an authoritative historical business record.
   - At creation time, Electron Main captures `customerNameSnapshot`, `vehicleDescriptionSnapshot`, and `vinSnapshot`.
   - If the vehicle is subsequently sold to another customer, or if the customer changes their name, historical work orders remain unaltered.
2. **Monotonic Sequential Work Order Numbering (`WO-XXXXXX`)**:
   - Work order numbers are generated strictly in Electron Main from a monotonic counter (`nextWorkOrderSequence`).
   - Counter numbers are never reused even if a work order is archived or cancelled.
3. **Deterministic Schema Migration (V1/V2 → V3)**:
   - Migration ensures `workOrders: []` and `nextWorkOrderSequence: 1` are cleanly initialized when loading stores from earlier versions.
4. **Independent Vehicle Lifecycle & Preservation**:
   - Soft-deleting a customer marks `customer.isDeleted = true` but leaves all owned vehicles and work orders intact.
   - Soft-deleted owners appear in vehicle and work order views with `(Archived Owner)` or historical snapshot tags.
5. **Strict Data Validation in Main**:
   - `customerConcern` is required (non-empty).
   - Labor hours must be non-negative (`>= 0`).
   - Part quantities must be strictly positive (`> 0`).
   - Odometer readings must be non-negative, and `odometerOut >= odometerIn`.
   - Setting `status: 'completed'` automatically stamps `completedAt = Date.now()`; moving out of completed clears `completedAt`.

---

## Universal Tab Integration

- **Automotive Hub (`type: 'automotive'`)**:
  - Top metric summary cards for Active Work Orders, Completed Repairs, Tracked Vehicles, and Customer Accounts.
  - 3-way toggle between **Work Orders**, **Vehicles**, and **Customers** directories.
  - Status filter pills (All, Open, Diagnosing, In Progress, Waiting Parts, Completed).
- **Vehicle Tab (`type: 'automotive-vehicle'`, `resourceId: vehicleId`)**:
  - Live Service History & Work Orders table with direct `+ New Work Order` button.
  - Clicking any work order opens its tab.
- **Customer Tab (`type: 'automotive-customer'`, `resourceId: customerId`)**:
  - Customer Work Orders history section displaying all repairs performed across the customer's fleet.
- **Work Order Detail Tab (`type: 'automotive-work-order'`, `resourceId: workOrderId`)**:
  - Universal Tab view for managing repair operations, odometer in/out, diagnosis, labor lines with total hours, parts lines with total item counts, and status transitions.
  - Single-instance tab deduplication.
