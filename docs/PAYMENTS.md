# Artemis Automotive Payments & Balance Tracking Subsystem (V0.0.10)

## 1. Core Architectural Principle

> **Fundamental Rule:**
> - **Work Order:** *"What happened to the vehicle?"* (Technical repair record).
> - **Estimate:** *"What did we offer to do, and for how much?"* (Proposed commercial terms).
> - **Invoice:** *"What did we bill the customer?"* (Formal point-in-time billed record).
> - **Payment:** *"What money did we actually receive and when?"* (Authoritative cash ledger entry).
>
> **Invoice lifecycle and payment state are distinct concepts.** An Invoice remains `ISSUED` while its payment state transitions independently (`UNPAID` $\rightarrow$ `PARTIALLY PAID` $\rightarrow$ `PAID`). Payment status and balance due are derived dynamically from posted payment records rather than stored as mutable fields on the invoice.

```text
Work Order (WO-000001)
   │
   ▼
Estimate (EST-000001)
   │
   ▼
Invoice (INV-000001) ── [Status: ISSUED, Total: $842.67]
   │
   ├── Payment (PAY-000001): $500.00 Card ────► [Paid: $500.00, Balance: $342.67, Status: PARTIALLY PAID]
   │
   └── Payment (PAY-000002): $342.67 Check ───► [Paid: $842.67, Balance: $0.00, Status: PAID]
```

---

## 2. Separation of Invoice Lifecycle vs Derived Payment State

### Invoice Lifecycle (`InvoiceStatus`):
- `draft`: Editable proposal before issuing to customer.
- `issued`: Finalized point-in-time commercial billed record.
- `void`: Permanently cancelled invoice (requires audit reason).

### Derived Payment Status (`InvoicePaymentStatus`):
- `unpaid`: Active posted payments = $0 and invoice total > $0.
- `partially_paid`: $0 < \text{active posted payments} < \text{invoice total}$.
- `paid`: $\text{active posted payments} \ge \text{invoice total}$ or invoice total = $0.

$$\text{paidCents} = \sum_{p \in \text{posted payments}} p.\text{amountCents}$$
$$\text{balanceDueCents} = \max(0, \text{invoice}.\text{totalCents} - \text{paidCents})$$

---

## 3. Payment Record Data Model

```typescript
export type PaymentStatus = 'posted' | 'void';

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'check'
  | 'bank_transfer'
  | 'digital_wallet'
  | 'financing'
  | 'other';

export interface PaymentRecord {
  id: string;                               // Unique UUID
  paymentNumber: string;                    // Monotonic sequential ID (e.g. PAY-000001)
  invoiceId: string;                        // Target issued invoice ID
  customerId?: string;                      // Owning customer ID
  vehicleId?: string;                       // Serviced vehicle ID
  workOrderId?: string;                     // Originating work order ID
  amountCents: number;                      // Positive integer cents (> 0)
  method: PaymentMethod;                    // Payment instrument
  status: PaymentStatus;                    // 'posted' | 'void'
  balanceBeforeCents: number;               // Snapshot of balance prior to payment
  balanceAfterCents: number;                // Snapshot of balance after payment
  customerNameSnapshot?: string;            // Frozen customer billing name
  vehicleDescriptionSnapshot?: string;      // Frozen vehicle description
  invoiceNumberSnapshot: string;            // Frozen invoice number (e.g. INV-000008)
  invoiceTotalSnapshotCents: number;        // Frozen invoice total cents
  reference?: string;                       // Optional auth code, check number, bank ref
  notes?: string;                           // Optional internal bookkeeping notes
  voidedAt?: number;                        // Epoch timestamp when voided
  voidReason?: string;                      // Mandatory audit reason for voiding
  receivedAt: number;                       // Date/time money was received (editable)
  createdAt: number;                        // Main-generated record creation timestamp
  updatedAt: number;                        // Last updated timestamp
}
```

---

## 4. Payment Creation Constraints & Validation

1. **Issued Invoices Only**: Payments can only be recorded against invoices with `status === 'issued'`. Attempts to record payments against `draft` or `void` invoices are strictly rejected.
2. **Positive Integer Cents**: `amountCents` must be an integer $> 0$. Zero or negative values are rejected.
3. **No Overpayments**: `amountCents` cannot exceed the invoice's current `balanceDueCents`.
4. **Monotonic Sequence (`PAY-XXXXXX`)**: Numbers are generated monotonically in Electron Main (`PAY-000001`, `PAY-000002`). Sequences are never reused upon voiding.
5. **No Card Credentials**: Artemis does not store card numbers, expiration dates, CVVs, bank account numbers, or online banking passwords. Only high-level payment methods, optional transaction references, and internal notes are kept.

---

## 5. Payment Voiding & Invoice Void Lockout Guard

### Voiding a Payment (`payments.void`):
- Requires a mandatory non-empty `reason`.
- Sets `status = 'void'`, `voidedAt = Date.now()`, and stores `voidReason`.
- **Instant Balance Restoration**: A voided payment immediately contributes $0 to `paidCents`, reverting the invoice balance due.
- **Audit Preservation**: Voided payments are never deleted and retain their `PAY-XXXXXX` sequence number. Re-voiding is blocked.

### Invoice Void Lockout Guard:
- `invoices.void(id, reason)` verifies that **no active posted payments exist** against the invoice.
- If posted payments exist, the void operation is rejected with an actionable error requiring all associated payments to be voided first.

---

## 6. Printable Payment Receipts & UI Views

### Printable Receipt (`@media print`):
- Accessible directly from `PaymentDetailTab` via **Print Receipt** (`window.print()`).
- Formatted as a clean Point of Sale payment receipt:
  - Shop branding ("ARTEMIS AUTOMOTIVE — PAYMENT RECEIPT").
  - Receipt Date, Receipt #, Applied Invoice #.
  - Customer & Vehicle snapshot metadata.
  - Financial Ledger: Billed Total, Balance Prior, Amount Received, Remaining Balance Due.
  - Payment Method & Reference / Auth number.
  - Prominent **VOID** watermark / stamp if the payment is voided.
  - Internal shop notes and void reasons are omitted from customer receipts.

### Cross-Subsystem Integration:
- **Invoice Detail Tab (`InvoiceDetailTab`)**:
  - Payment status badge (`Paid in Full`, `Partially Paid`, `Unpaid`) and overdue indicator.
  - Payment summary overview banner (Total Billed, Total Paid, Balance Due).
  - Quick action `+ Record Payment` modal with "Pay Full Balance" shortcut.
  - Comprehensive Payment History table with direct links to payment receipts.
- **Customer Detail Tab (`CustomerDetailTab`)**:
  - Displays Invoices with balance due indicators.
  - Dedicated "Payments & Receipts" section showing customer payment history.
- **Work Order & Vehicle Tabs**:
  - Linked invoice cards display current payment status and balance due.
- **Automotive Hub (`AutomotiveHubTab`)**:
  - **Accounts Receivable Banner**: Outstanding Receivables, Unpaid Invoices, Partially Paid Invoices, Payments Received Today.
  - **Payments Directory Tab**: Search and filter payments by method and status (posted / void).
