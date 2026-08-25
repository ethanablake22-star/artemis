# Artemis Automotive Estimates & Pricing Subsystem (V0.0.8)

## 1. Core Architectural Principle

> **Fundamental Rule:**
> **A Work Order records what happened to the vehicle. An Estimate records what you proposed to charge.**
> These are related commercial records, but they are never the same entity.

```text
Work Order (WO-000014)               Commercial Estimate (EST-000006)
├── Customer concern                  ├── Labor pricing (Hours × Rate)
├── Technical diagnosis               ├── Parts pricing
├── Labor performed                   ├── Materials & Fees
├── Parts installed                   ├── Proportional Discount
└── Odometer / inspection             ├── Sales Tax (Basis Points)
                                      ├── Authoritative Total (Cents)
                                      └── Approval State
```

---

## 2. 100% Integer-Cent Monetary Representation

Artemis completely avoids JavaScript floating-point arithmetic for authoritative financial calculations:
- All monetary totals and unit prices are stored strictly as integer cents (`subtotalCents`, `discountTotalCents`, `taxableSubtotalCents`, `taxTotalCents`, `totalCents`, `unitPriceCents`).
  - Example: `$125.50` -> `12550` cents.
- Input strings are parsed deterministically from decimal representations (e.g. `"125.50"` or `"$1,234.56"`). Malformed inputs or precision exceeding 2 decimal places are rejected.
- Formatted human strings (e.g. `"$125.50"`) are generated from integer cents via `formatCents`.

---

## 3. Basis Points & Scaled Integer Arithmetic

### Basis Points for Percentages
- Tax rates and percentage discounts are represented as integer basis points (`taxRateBps`, `discountPercentBps`), where:
  - `7.00%` = `700` bps
  - `6.50%` = `650` bps
  - `10.25%` = `1025` bps
  - `100.00%` = `10000` bps
- Percentage discounts exceeding 100% (10000 bps) are strictly rejected.

### Scaled Quantity Precision (`quantityMilli`)
- Line item quantities are stored as integer milli-units (`quantityMilli`), supporting up to 3 decimal places without floating-point numbers:
  - `1.000` = `1000`
  - `1.500` = `1500`
  - `2.250` = `2250`
  - `0.125` = `125`
- Line totals:
  $$\text{lineTotalCents} = \text{round}\left(\frac{\text{quantityMilli} \times \text{unitPriceCents}}{1000}\right)$$

---

## 4. Deterministic Proportional Discount & Tax Allocation

When a global discount is applied, it is allocated proportionally between taxable and non-taxable gross amounts:

$$\text{taxableDiscountCents} = \text{subtotalCents} > 0 \;?\; \text{round}\left(\frac{\text{discountTotalCents} \times \text{taxableGrossCents}}{\text{subtotalCents}}\right) : 0$$

$$\text{taxableSubtotalCents} = \max(0, \text{taxableGrossCents} - \text{taxableDiscountCents})$$

$$\text{taxTotalCents} = \text{round}\left(\frac{\text{taxableSubtotalCents} \times \text{taxRateBps}}{10000}\right)$$

$$\text{totalCents} = \text{subtotalCents} - \text{discountTotalCents} + \text{taxTotalCents}$$

---

## 5. Work Order Import Semantics

When creating an Estimate with `importWorkOrderItems: true`:
- Electron Main loads the authoritative Work Order record from disk.
- Work Order labor operations are copied to Estimate `labor` lines (`unitPriceCents` initialized to `defaultLaborRateCents` or `0`, `sourceWorkOrderLaborLineId` recorded for traceability).
- Work Order parts are copied to Estimate `part` lines (`taxable: true`, `sourceWorkOrderPartLineId` recorded).
- Relationships and historical snapshots (`vehicleDescriptionSnapshot`, `customerNameSnapshot`, `workOrderNumberSnapshot`) are derived authoritatively from the Work Order.
- Future edits to the Work Order do not modify the copied Estimate lines.

---

## 6. Estimate Lifecycle & Approval Integrity

### Status Progression
$$\text{draft} \longleftrightarrow \text{ready} \longrightarrow \text{approved} \;|\; \text{declined} \longrightarrow \text{expired} \;|\; \text{superseded}$$

- `approved`: Sets `approvedAt = Date.now()`.
- `declined`: Sets `declinedAt = Date.now()`.

### Immutability & Reopening
- **Normal Update Lock**: Electron Main strictly blocks normal update calls on approved Estimates.
- **Deletion Guard**: Deleting an approved Estimate is rejected to protect commercial audit integrity.
- **Explicit Reopen**: Reopening an approved Estimate is a separate operation (`reopenEstimate(id)`) that clears `approvedAt`, transitions status back to `draft`, and requires explicit confirmation in the UI.

---

## 7. Universal Tab Model & Print Support

- Tab Type: `automotive-estimate`
- Tab Resource ID: Estimate UUID
- Deduplication: `tab.type + tab.resourceId`
- Title: `EST-000006 — 2006 Mercedes-Benz SL500`
- Print / PDF Export: Integrated clean print stylesheet (`@media print`) rendering a customer-ready commercial proposal while hiding internal editor controls and shop notes.
