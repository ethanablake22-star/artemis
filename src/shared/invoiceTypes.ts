import type { EstimateLineType, EstimateDiscountType } from './estimateTypes';

export type InvoiceLineType = EstimateLineType;
export type InvoiceDiscountType = EstimateDiscountType;
export type InvoiceStatus = 'draft' | 'issued' | 'void';

export interface InvoiceLineItem {
  /** Unique immutable line item UUID generated in Electron Main */
  id: string;
  type: EstimateLineType;

  description: string;

  /** Scaled quantity (1000 = 1.000 units, 2500 = 2.500 hours) */
  quantityMilli: number;

  /** Unit price in integer cents ($100.00 = 10000) */
  unitPriceCents: number;

  taxable: boolean;

  /** Traceability reference back to the source estimate line item */
  sourceEstimateLineItemId?: string;

  notes?: string;
}

export interface InvoiceRecord {
  /** Stable immutable UUID generated authoritatively in Electron Main */
  id: string;
  /** Authoritative human-facing sequential invoice number (e.g. INV-000001) */
  invoiceNumber: string;

  /** Foreign key referencing the source Estimate */
  estimateId: string;
  /** Foreign key referencing the associated Work Order */
  workOrderId: string;
  /** Foreign key referencing the vehicle */
  vehicleId: string;
  /** Foreign key referencing the customer, or null if unassigned/shop-owned */
  customerId: string | null;

  /** Immutable historical snapshots captured authoritatively at creation */
  estimateNumberSnapshot: string;
  /** Authoritative approved total of the source Estimate for validation (in cents) */
  estimateTotalSnapshotCents: number;
  workOrderNumberSnapshot: string;
  vehicleDescriptionSnapshot: string;
  customerNameSnapshot?: string;
  customerAddressSnapshot?: string;
  customerEmailSnapshot?: string;
  customerPhoneSnapshot?: string;

  /** Operational lifecycle status: draft -> issued -> void */
  status: InvoiceStatus;

  /** Billed line items */
  lineItems: InvoiceLineItem[];

  /** Commercial discount rules */
  discountType?: EstimateDiscountType;
  /** Fixed discount in integer cents */
  fixedDiscountCents?: number;
  /** Percentage discount in basis points (1000 = 10.00%, max 10000 = 100.00%) */
  discountPercentBps?: number;

  /** Tax rate in basis points (700 = 7.00%, 0 = 0.00%) */
  taxRateBps: number;

  /** Authoritative persisted monetary totals (100% integer cents) */
  subtotalCents: number;
  discountTotalCents: number;
  taxableSubtotalCents: number;
  taxTotalCents: number;
  totalCents: number;

  /** Customer-visible invoice note or payment terms */
  customerMessage?: string;
  /** Private internal shop notes (never exposed on customer-facing invoice/PDF) */
  internalNotes?: string;

  /** Calendar due date in ISO YYYY-MM-DD format (timezone independent) */
  dueDate?: string;

  /** Timestamp when invoice was formally issued (epoch ms) */
  issuedAt?: number;
  /** Timestamp when invoice was voided (epoch ms) */
  voidedAt?: number;
  /** Non-empty mandatory audit reason for voiding */
  voidReason?: string;

  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}

export interface CreateInvoiceOptions {
  /** UUID of the source approved Estimate */
  estimateId: string;
  /** Optional initial calendar due date in YYYY-MM-DD format */
  dueDate?: string;
  /** Optional customer message override */
  customerMessage?: string;
  /** Optional internal shop notes */
  internalNotes?: string;
}

export interface UpdateInvoiceOptions {
  lineItems?: (InvoiceLineItem | Omit<InvoiceLineItem, 'id'>)[];
  discountType?: EstimateDiscountType;
  fixedDiscountCents?: number;
  discountPercentBps?: number;
  taxRateBps?: number;
  customerMessage?: string;
  internalNotes?: string;
  dueDate?: string;
}

export interface ListInvoicesFilter {
  estimateId?: string;
  workOrderId?: string;
  vehicleId?: string;
  customerId?: string | null;
  status?: InvoiceStatus;
  query?: string;
  includeDeleted?: boolean;
}

export interface InvoicesBridge {
  list: (filter?: ListInvoicesFilter) => Promise<InvoiceRecord[]>;
  get: (id: string) => Promise<InvoiceRecord | null>;
  create: (options: CreateInvoiceOptions) => Promise<InvoiceRecord>;
  update: (id: string, updates: UpdateInvoiceOptions) => Promise<InvoiceRecord>;
  issue: (id: string) => Promise<InvoiceRecord>;
  void: (id: string, reason: string) => Promise<InvoiceRecord>;
  delete: (id: string) => Promise<boolean>;
}

export interface IInvoiceStorageRepository {
  listInvoices(filter?: ListInvoicesFilter): Promise<InvoiceRecord[]>;
  getInvoice(id: string): Promise<InvoiceRecord | null>;
  createInvoice(options: CreateInvoiceOptions): Promise<InvoiceRecord>;
  updateInvoice(id: string, updates: UpdateInvoiceOptions): Promise<InvoiceRecord>;
  issueInvoice(id: string): Promise<InvoiceRecord>;
  voidInvoice(id: string, reason: string): Promise<InvoiceRecord>;
  deleteInvoice(id: string): Promise<boolean>;
}
