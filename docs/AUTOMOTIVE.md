# Artemis Automotive Architecture & Data Model (Schema V5)

## Overview

**Artemis Automotive** is the native customer relationship management, vehicle fleet tracking, service work order, commercial estimating, and invoicing subsystem for the Artemis desktop platform. It provides an operational foundation for mechanic shops, fleet operators, and engineering teams to maintain customer accounts, vehicle profiles, VINs, mileage records, powertrain specifications, repair work orders, commercial price proposals, and final invoices directly within Artemis universal tabs.

---

## Data Models & Entity Relationships (Schema V5)

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
└───────────────────────────┬────────────────────────────┘
                            │
              1 to Many Point-in-Time Invoices (1 active)
                            │
┌───────────────────────────▼────────────────────────────┐
│                    InvoiceRecord                       │
│   id: "inv-uuid-..." (Immutable UUID)                  │
│   invoiceNumber: "INV-000001" (Monotonic)              │
│   estimateId: "est-uuid-..." (FK)                      │
│   workOrderId: "wo-uuid-..." (FK)                      │
│   vehicleId: "veh-uuid-..." (FK)                       │
│   customerId: "cust-uuid-..." | null (FK)              │
│   estimateNumberSnapshot: "EST-000001"                 │
│   estimateTotalSnapshotCents: 49450                    │
│   customerAddressSnapshot: "123 Main St..."            │
│   customerEmailSnapshot: "ethan@example.com"           │
│   customerPhoneSnapshot: "555-0199"                    │
│   lineItems: [ { id, type, desc, qtyMilli, unitCents } ]│
│   dueDate: "2026-09-15" (Calendar Date)                │
│   totalCents: 49450 ($494.50)                          │
│   status: "draft" | "issued" | "void"                  │
│   isDeleted: false                                     │
└────────────────────────────────────────────────────────┘
```

---

## Separation of Operational Entities

> - **Work Order:** *"What happened to the vehicle?"* (Technical repair record).
> - **Estimate:** *"What did we offer to do, and for how much?"* (Commercial proposal).
> - **Invoice:** *"What does the customer actually owe?"* (Formal billed financial record).
>
> See full details in [docs/ESTIMATES.md](file:///home/EthanABlake/Projects/artemis/docs/ESTIMATES.md) and [docs/INVOICES.md](file:///home/EthanABlake/Projects/artemis/docs/INVOICES.md).

---

## Architectural Guarantees & Invariants

1. **Integer-Cent Monetary Mathematics**:
   - Zero floating-point arithmetic for money storage and calculations.
   - All currencies stored as integer cents (`*Cents`), percentages as basis points (`*Bps`), quantities as scaled milli-units (`*Milli`).
2. **Historical Snapshot Integrity**:
   - Work Orders, Estimates, and Invoices preserve snapshots independently.
   - Modifying a repair log does not alter commercial proposals or issued invoices.
3. **Monotonic Sequential Numbering**:
   - `CUS-XXXXXX`, `VEH-XXXXXX`, `WO-XXXXXX`, `EST-XXXXXX`, `INV-XXXXXX` generated authoritatively in Electron Main without number recycling.
4. **Approved Estimate & Issued Invoice Protection**:
   - Estimates in `approved` status and Invoices in `issued` status cannot be mutated via normal update APIs.
   - Invoices cannot be issued if their total exceeds the approved source Estimate total.
   - Voiding an issued invoice is a permanent lifecycle transition requiring an explicit reason.
   - Reopening an estimate is locked out while an active invoice exists.
5. **Deterministic Schema Migration (V1..V4 → V5)**:
   - Upgrades data files seamlessly to `schemaVersion: 5` with initialized `invoices: []` and `nextInvoiceSequence: 1`.
