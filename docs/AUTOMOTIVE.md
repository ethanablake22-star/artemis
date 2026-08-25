# Artemis Automotive Architecture & Data Model (Schema V4)

## Overview

**Artemis Automotive** is the native customer relationship management, vehicle fleet tracking, service work order, and commercial estimating subsystem for the Artemis desktop platform. It provides an operational foundation for mechanic shops, fleet operators, and engineering teams to maintain customer accounts, vehicle profiles, VINs, mileage records, powertrain specifications, repair work orders, and commercial price proposals directly within Artemis universal tabs.

---

## Data Models & Entity Relationships (Schema V4)

Automotive data is authoritatively stored, validated, numbered, and snapshot-preserved in the Electron Main Process:

```text
┌────────────────────────────────────────────────────────┐
│                    CustomerRecord                      │
│   id: "cust-uuid-..." (Immutable UUID)                 │
│   customerNumber: "CUS-000001" (Authoritative Monotonic)│
│   type: "individual" | "business"                      │
│   name: "Ethan Blake" (Main-synchronized display name) │
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
│   year?: 2006, make: "Mercedes", model: "SL500"        │
│   vin?: "WDBSK75F76F..." (Globally Unique, Uppercase)  │
│   mileage: 64250                                       │
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
│   customerConcern: "ABC warning light illuminated"     │
│   diagnosis?: "Valve block seals leaking"              │
│   laborLines: [ { id, description, hours } ]           │
│   partLines: [ { id, description, partNumber, qty } ]  │
│   status: "open" | "diagnosing" | "completed" | ...    │
│   isDeleted: false                                     │
└───────────────────────────┬────────────────────────────┘
                            │
              1 to Many Commercial Proposals (Estimates)
                            │
┌───────────────────────────▼────────────────────────────┐
│                   EstimateRecord                       │
│   id: "est-uuid-..." (Immutable UUID)                  │
│   estimateNumber: "EST-000001" (Monotonic)             │
│   workOrderId: "wo-uuid-..." (FK)                      │
│   vehicleId: "veh-uuid-..." (FK)                       │
│   customerId: "cust-uuid-..." | null (FK)              │
│   lineItems: [ { id, type, desc, qtyMilli, unitCents } ]│
│   subtotalCents: 51350 ($513.50)                       │
│   discountTotalCents: 5135 (-$51.35)                   │
│   taxRateBps: 700 (7.00%)                              │
│   taxTotalCents: 3235 ($32.35)                         │
│   totalCents: 49450 ($494.50)                          │
│   status: "draft" | "ready" | "approved" | "declined"  │
│   isDeleted: false                                     │
└────────────────────────────────────────────────────────┘
```

---

## Separation of Work Orders & Estimates

> **A Work Order records what happened to the vehicle. An Estimate records what you proposed to charge.**
> See full details in [docs/ESTIMATES.md](file:///home/EthanABlake/Projects/artemis/docs/ESTIMATES.md).

---

## Architectural Guarantees & Invariants

1. **Integer-Cent Monetary Mathematics**:
   - Zero floating-point arithmetic for money storage and calculations.
   - All currencies stored as integer cents (`*Cents`), percentages as basis points (`*Bps`), quantities as scaled milli-units (`*Milli`).
2. **Historical Snapshot Integrity**:
   - Work Orders and Estimates preserve customer and vehicle snapshots independently.
   - Modifying a repair log does not alter commercial proposals already presented to the customer.
3. **Monotonic Sequential Numbering**:
   - `CUS-XXXXXX`, `VEH-XXXXXX`, `WO-XXXXXX`, `EST-XXXXXX` generated authoritatively in Electron Main without number recycling.
4. **Approved Estimate Immutability**:
   - Estimates in `approved` status cannot be mutated or deleted via ordinary APIs.
   - An explicit `reopenEstimate(id)` operation transitions status back to `draft` and clears `approvedAt`.
5. **Deterministic Schema Migration (V1/V2/V3 → V4)**:
   - Upgrades data files seamlessly to `schemaVersion: 4` with initialized `estimates: []` and `nextEstimateSequence: 1`.
