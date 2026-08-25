# Artemis Automotive Invoices Subsystem (V0.0.9)

## 1. Core Architectural Principle

> **Fundamental Rule:**
> - **Work Order:** *"What happened to the vehicle?"* (Technical repair record).
> - **Estimate:** *"What did we offer to do, and for how much?"* (Commercial proposal).
> - **Invoice:** *"What does the customer actually owe?"* (Formal billed financial record).
>
> An Invoice is an independent point-in-time financial record. It does not remain live-linked to Estimate pricing or Customer contact changes.

```text
Work Order (WO-000014)          Commercial Estimate (EST-000006)         Commercial Invoice (INV-000001)
├── Customer concern             ├── Labor pricing ($/hr)                 ├── Point-in-time line snapshots
├── Diagnosis notes              ├── Parts pricing                        ├── Proportional discounts
├── Work performed               ├── Proportional Discount                ├── Sales tax (Basis Points)
└── Technician notes             ├── Sales Tax (Basis Points)             ├── Calendar Due Date (YYYY-MM-DD)
                                 └── Approval State                       ├── Customer Billing Snapshot
                                                                          └── Lifecycle: Draft → Issued → Void
```

---

## 2. Point-in-Time Snapshot Isolation

When an Invoice is generated from an approved Estimate:
1. **Line Items Deep-Copied**: Line items are cloned with fresh unique IDs and `sourceEstimateLineItemId` traceability links.
2. **Customer Billing Snapshots Captured**: Name, physical address (`customerAddressSnapshot`), email (`customerEmailSnapshot`), and phone (`customerPhoneSnapshot`) are frozen from the customer record at creation time.
3. **Estimate Total Frozen**: `estimateTotalSnapshotCents` records the approved dollar cap for issuance validation.
4. **Historical Persistence**: Subsequent edits to the Estimate, Customer, Vehicle, or Work Order do NOT mutate issued or void invoices.

---

## 3. Strict 100% Integer-Cent Monetary Model

Artemis completely avoids JavaScript floating-point arithmetic for authoritative financial calculations:
- **Integer Cents**: All monetary figures (`subtotalCents`, `discountTotalCents`, `taxableSubtotalCents`, `taxTotalCents`, `totalCents`, `unitPriceCents`) are stored as whole integer cents.
  - Example: `$842.67` $\rightarrow$ `84267` cents.
- **Basis Points (BPS)**: Tax rates and percentage discounts are represented as integer basis points (`taxRateBps`, `discountPercentBps`), where:
  - `7.00%` = `700` bps
  - `8.25%` = `825` bps
  - `100.00%` = `10000` bps
- **Scaled Quantity Precision (`quantityMilli`)**: Stored as integer milli-units (e.g. `2500` = `2.500` hours, `1000` = `1.000` unit).

### Deterministic Totals Formula:
$$\text{lineTotalCents} = \text{round}\left(\frac{\text{quantityMilli} \times \text{unitPriceCents}}{1000}\right)$$

$$\text{taxableDiscountCents} = \text{subtotalCents} > 0 \;?\; \text{round}\left(\frac{\text{discountTotalCents} \times \text{taxableGrossCents}}{\text{subtotalCents}}\right) : 0$$

$$\text{taxableSubtotalCents} = \max(0, \text{taxableGrossCents} - \text{taxableDiscountCents})$$

$$\text{taxTotalCents} = \text{round}\left(\frac{\text{taxableSubtotalCents} \times \text{taxRateBps}}{10000}\right)$$

$$\text{totalCents} = \text{subtotalCents} - \text{discountTotalCents} + \text{taxTotalCents}$$

---

## 4. Operational Lifecycle & Mutation Integrity

```text
         ┌───────────────┐
         │     Draft     │ ──(Soft Delete)──> [Deleted]
         └───────────────┘
                 │
           (Issue Invoice)  * Requires totalCents <= estimateTotalSnapshotCents
                 │
                 ▼
         ┌───────────────┐
         │    Issued     │ ──(Void with Reason)──> ┌───────────────┐
         └───────────────┘                         │     Void      │
                                                   └───────────────┘
```

### Lifecycle Rules:
1. **Creation**: May only be created from an **approved** Estimate (`status === 'approved'`). Only **one** active (non-deleted, non-void) Invoice per Estimate is permitted simultaneously.
2. **Draft Modifications**: Full line item and discount editing is supported while in `draft` status.
3. **Estimate Cap on Issuance**: `issueInvoice(id)` checks that `totalCents <= estimateTotalSnapshotCents`. Invoices exceeding the customer-approved Estimate total are rejected unless the Estimate is formally reopened and reapproved.
4. **Issued Immutability**: Once `issued`, an Invoice cannot be edited or deleted.
5. **Voiding**: Only `issued` Invoices can be voided. Requires an explicit, non-empty `voidReason`. Voided invoices remain permanently in historical records.
6. **Deletion**: Only `draft` Invoices can be soft-deleted. Deleting issued or void invoices is strictly rejected.
7. **Estimate Reopen Lockout**: `reopenEstimate(id)` is blocked while an active (non-deleted, non-void) Invoice exists. Deleting a draft invoice or voiding an issued invoice frees the Estimate so it may be reopened, revised, and re-invoiced.

---

## 5. Calendar Due Dates

- Due dates are stored as local calendar date strings: `dueDate: 'YYYY-MM-DD'` (e.g. `'2026-09-15'`).
- This avoids UTC timestamp boundary distortion across daylight saving and multi-timezone environments.
- Timestamps for creation, update, issuance, and voiding (`createdAt`, `updatedAt`, `issuedAt`, `voidedAt`) remain UTC epoch milliseconds.

---

## 6. Print & PDF Presentation

- **Universal Tab Type**: `automotive-invoice`
- **Tab Title**: `INV-000001 — Sarah Connor`
- **Print Layout (`@media print`)**:
  - Renders formal commercial invoice styling.
  - Pulls identity exclusively from frozen snapshot fields (`customerNameSnapshot`, `customerAddressSnapshot`, `customerPhoneSnapshot`, `customerEmailSnapshot`, `vehicleDescriptionSnapshot`).
  - Visibly displays prominent `DRAFT` or `VOID` watermarks when applicable.
  - Automatically hides editor controls, action bars, navigation, and internal shop notes.

---

## 7. Scope Boundaries (V0.0.9)

The following features are intentionally out of scope for V0.0.9 and deferred to future releases:
- Payment transactions, merchant processing, partial payments, deposits.
- Credit memos, refund records, accounting ledgers.
- Email delivery, automated SMS notifications, online payment links.
- QuickBooks / external accounting software synchronization.
