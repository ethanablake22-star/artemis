# Artemis Automotive Architecture & Data Model (Schema V2)

## Overview

**Artemis Automotive** is the native customer relationship management and vehicle fleet tracking subsystem for the Artemis desktop platform. It provides an operational foundation for mechanic shops, fleet operators, and engineering teams to maintain customer accounts, vehicle profiles, VINs, mileage records, powertrain specifications, and service relationships directly within Artemis universal tabs.

---

## Data Models & Entity Relationships (Schema V2)

Automotive data is authoritatively stored, validated, and numbered in the Electron Main Process:

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
└────────────────────────────────────────────────────────┘
```

### TypeScript Definitions
```typescript
export type CustomerType = 'individual' | 'business';

export interface CustomerRecord {
  id: string;
  customerNumber: string; // CUS-000001
  type: CustomerType;
  name: string; // Authoritatively synchronized in Main
  firstName?: string;
  lastName?: string;
  businessName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}

export interface VehicleRecord {
  id: string;
  vehicleNumber: string; // VEH-000001
  customerId: string | null; // Nullable for shop/unassigned vehicles
  vin?: string; // Globally unique across all records (including archived)
  year?: number; // Optional
  make: string;
  model: string;
  trim?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  licensePlate?: string;
  mileage?: number;
  color?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}

export interface ArtemisAutomotiveStoreData {
  schemaVersion: 2;
  nextCustomerSequence: number;
  nextVehicleSequence: number;
  customers: CustomerRecord[];
  vehicles: VehicleRecord[];
}
```

---

## Architectural Guarantees & Invariants

1. **Non-Reusable Human Identifiers (`CUS-XXXXXX` / `VEH-XXXXXX`)**:
   - Customer and vehicle numbers are generated strictly in Electron Main from monotonic counters (`nextCustomerSequence`, `nextVehicleSequence`).
   - Deleting or soft-deleting a record **never** decreases the counter or permits reuse of assigned numbers.
2. **Deterministic Schema Migration (V1 → V2)**:
   - Existing V1 records are sorted by `createdAt ASC` (with immutable `id` UUID as a tie-breaker).
   - Sequential numbers are assigned cleanly (`CUS-000001`, `VEH-000001`), and sequence counters are initialized to continue monotonically.
3. **Independent Vehicle Lifecycle (No Cascading Deletion)**:
   - Soft-deleting a customer marks `customer.isDeleted = true` but **leaves all owned vehicles active**.
   - Preserves historical integrity for service histories and future work orders.
   - When viewing a vehicle whose customer account has been soft-deleted, the UI clearly displays `(Archived Owner)`.
   - Vehicle ownership can be reassigned at any time.
4. **Global VIN Uniqueness**:
   - Normalized (trimmed and uppercase) VINs must be unique across all vehicles in the store, **including soft-deleted vehicles**, preventing duplicate VIN entry and restoration conflicts.
5. **Nullable Customer Relationships**:
   - Vehicles may exist without an assigned customer (`customerId: null`), supporting shop fleet vehicles, project cars, inventory acquisitions, or pre-intake entries.

---

## Universal Tab Integration

- **Automotive Hub (`type: 'automotive'`)**:
  - Fleet metrics, real-time search across customer names, numbers, VINs, plates, makes, and models.
- **Customer Tab (`type: 'automotive-customer'`, `resourceId: customerId`)**:
  - Account profile, contact points, individual vs business data, notes, and owned vehicle cards.
  - Clicking any vehicle opens that vehicle's tab.
- **Vehicle Tab (`type: 'automotive-vehicle'`, `resourceId: vehicleId`)**:
  - Vehicle specs, dedicated powertrain grid (Engine, Transmission, Drivetrain), mileage tracker, and owner card with cross-navigation.

---

## Next Milestone: Task 005 — Work Orders

With the hardened Schema V2 model in place, the relationship expands to:
```
CUSTOMER (CUS-000001)
   │
   ▼
VEHICLE (VEH-000001)
   │
   ▼
WORK ORDER (WO-000001)
   ├── Status (Draft → In Progress → Waiting Parts → Completed → Invoiced)
   ├── Odometer In / Out
   ├── Customer Concern & Symptoms
   ├── Inspection / Diagnosis
   ├── Labor Lines & Hours
   ├── Parts & Quantities
   ├── Technician Notes
   └── Document / Photo Attachments
```
