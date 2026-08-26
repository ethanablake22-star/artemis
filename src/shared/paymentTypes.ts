export type PaymentStatus = 'posted' | 'void';

export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'check'
  | 'bank_transfer'
  | 'digital_wallet'
  | 'financing'
  | 'other';

export type InvoicePaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface PaymentRecord {
  /** Stable immutable UUID generated authoritatively in Electron Main */
  id: string;
  /** Authoritative human-facing sequential payment number (e.g. PAY-000001) */
  paymentNumber: string;

  /** Foreign key referencing the associated issued Invoice */
  invoiceId: string;
  /** Foreign key referencing the customer, or null if unassigned/shop-owned */
  customerId: string | null;

  /** Immutable historical snapshots captured authoritatively at creation */
  invoiceNumberSnapshot: string;
  customerNameSnapshot?: string;
  vehicleDescriptionSnapshot: string;

  /** Operational lifecycle status: posted -> void */
  status: PaymentStatus;

  /** Payment amount in integer cents ($100.00 = 10000) */
  amountCents: number;
  /** Method of payment received */
  method: PaymentMethod;

  /** External reference identifier (e.g. Check #, transaction auth ID, wire ref) */
  reference?: string;
  /** Internal administrative or shop notes (hidden from customer receipts) */
  notes?: string;

  /** Timestamp when payment was physically or externally received (epoch ms) */
  receivedAt: number;

  /** Point-in-time financial snapshots */
  invoiceTotalSnapshotCents: number;
  balanceBeforeCents: number;
  balanceAfterCents: number;

  /** Main-generated record creation timestamp (epoch ms) */
  createdAt: number;

  /** Timestamp when payment was voided (epoch ms) */
  voidedAt?: number;
  /** Non-empty mandatory audit reason for voiding */
  voidReason?: string;
}

export interface InvoicePaymentSummary {
  invoiceId: string;
  invoiceTotalCents: number;
  paidCents: number;
  balanceDueCents: number;
  paymentStatus: InvoicePaymentStatus;
}

export interface AccountsReceivableSummary {
  totalReceivableCents: number;
  unpaidInvoicesCount: number;
  partiallyPaidInvoicesCount: number;
  paidInvoicesCount: number;
  paymentsReceivedTodayCents: number;
}

export interface CreatePaymentOptions {
  /** UUID of the target issued Invoice */
  invoiceId: string;
  /** Amount in integer cents (must be > 0 and <= current balance due) */
  amountCents: number;
  /** Method used for payment */
  method: PaymentMethod;
  /** Optional epoch timestamp when payment was received (defaults to Date.now()) */
  receivedAt?: number;
  /** Optional transaction reference or check number */
  reference?: string;
  /** Optional internal notes */
  notes?: string;
}

export interface ListPaymentsFilter {
  invoiceId?: string;
  customerId?: string | null;
  status?: PaymentStatus;
  method?: PaymentMethod;
  startDate?: number;
  endDate?: number;
  query?: string;
}

export interface PaymentsBridge {
  list: (filter?: ListPaymentsFilter) => Promise<PaymentRecord[]>;
  get: (id: string) => Promise<PaymentRecord | null>;
  create: (options: CreatePaymentOptions) => Promise<PaymentRecord>;
  void: (id: string, reason: string) => Promise<PaymentRecord>;
  getInvoiceSummary: (invoiceId: string) => Promise<InvoicePaymentSummary>;
  getAccountsReceivableSummary: () => Promise<AccountsReceivableSummary>;
}

export interface IPaymentStorageRepository {
  listPayments(filter?: ListPaymentsFilter): Promise<PaymentRecord[]>;
  getPayment(id: string): Promise<PaymentRecord | null>;
  createPayment(options: CreatePaymentOptions): Promise<PaymentRecord>;
  voidPayment(id: string, reason: string): Promise<PaymentRecord>;
  getInvoicePaymentSummary(invoiceId: string): Promise<InvoicePaymentSummary>;
  getAccountsReceivableSummary(): Promise<AccountsReceivableSummary>;
}
