# Artemis Automotive Architecture & Data Model

## Overview

**Artemis Automotive** is the native customer relationship management and vehicle fleet tracking subsystem for the Artemis desktop platform. It provides an operational foundation for mechanic shops, fleet operators, and engineering teams to maintain customer accounts, vehicle profiles, VINs, mileage records, and service relationships directly within Artemis universal tabs.

---

## Data Models & Entity Relationships

Automotive data is authoritatively stored and validated in the Electron Main Process:

```
┌────────────────────────────────────────────────────────┐
│                    CustomerRecord                      │
│   id: "cust-uuid-..."                                  │
│   name: "Ethan Test Customer"                          │
│   phone: "(555) 019-2834"                              │
│   email: "ethan@example.com"                           │
│   address: "123 Industrial Way"                        │
│   notes: "Prefers OEM parts"                           │
│   isDeleted: false                                     │
└───────────────────────────┬────────────────────────────┘
                            │
                   1 to Many Ownership
                            │
┌───────────────────────────▼────────────────────────────┐
│                    VehicleRecord                       │
│   id: "veh-uuid-..."                                   │
│   customerId: "cust-uuid-..." (Foreign Key)            │
│   year: 2006                                           │
│   make: "Mercedes"                                     │
│   model: "SL500"                                       │
│   trim: "AMG Package"                                  │
│   vin: "WDBSK75F76F..."                                │
│   licensePlate: "7XYZ123"                              │
│   mileage: 64250                                       │
│   color: "Obsidian Black"                              │
│   notes: "5.0L V8 M113, 722.9 7-speed auto"            │
│   isDeleted: false                                     │
└────────────────────────────────────────────────────────┘
```

### TypeScript Definitions
```typescript
export interface CustomerRecord {
  id: string; // Stable UUID generated in Main
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}

export interface VehicleRecord {
  id: string; // Stable UUID generated in Main
  customerId: string; // References CustomerRecord.id
  vin?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  licensePlate?: string;
  mileage?: number;
  color?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}

export interface ArtemisAutomotiveStoreData {
  schemaVersion: 1;
  customers: CustomerRecord[];
  vehicles: VehicleRecord[];
}
```

---

## Universal Tab Integration

Automotive operations fully leverage the Artemis universal tab shell:

1. **Automotive Hub (`type: 'automotive'`)**:
   - Singleton view showing fleet statistics, search filtering across customers and vehicles, customer directory, vehicle directory, and creation dialogs.
2. **Customer Tab (`type: 'automotive-customer'`, `resourceId: customerId`)**:
   - Dedicated workspace for an individual customer.
   - Shows profile information, contact points, notes, and all vehicles registered in their fleet.
   - Clicking any vehicle in the fleet opens that vehicle in its own tab.
3. **Vehicle Tab (`type: 'automotive-vehicle'`, `resourceId: vehicleId`)**:
   - Dedicated workspace for a vehicle profile.
   - Shows vehicle specifications, VIN, license plate, current odometer mileage, color, and engine notes.
   - Features a linked Owner Card; clicking the owner focuses the existing Customer Tab without duplicate tabs.

### Tab Deduplication Invariant
Opening a customer or vehicle that is already open immediately selects and focuses the existing tab, preventing duplicate open tabs for the same resource.

---

## Authoritative Electron Main Persistence

All mutations, validations, and disk operations execute within the Electron Main process:

- **Storage Location**: `app.getPath('userData')/artemis_automotive_store.json`
- **Schema Version**: `1`
- **Atomic File Swaps**: Writes to temporary files before atomically replacing the store on disk.
- **Validation Rules**:
  - Customer names cannot be empty.
  - Vehicle year must be a valid 4-digit year (`1900..2100`); make and model cannot be empty.
  - Vehicles cannot be registered to non-existent or deleted customers.
- **Soft-Deletion & Cascading**:
  - `deleteCustomer(id)` sets `isDeleted = true` and cascades soft-deletion to all owned vehicles.
  - `deleteVehicle(id)` soft-deletes the single vehicle record.

---

## Roadmap to Work Orders (Task 005)

With Customers and Vehicles established as first-class persistent entities, the next milestone introduces **Work Orders**:
```
Customer
   └── Vehicle
          └── Work Order
                 ├── Complaint & Symptoms
                 ├── Diagnostic Findings
                 ├── Labor Items & Hourly Rates
                 ├── Parts & Quantities
                 ├── Odometer In / Out
                 ├── Photos & Attachments
                 └── Status (Draft → In Progress → Waiting Parts → Completed → Invoiced)
```
