export type EstimateStatus =
  | 'draft'
  | 'ready'
  | 'approved'
  | 'declined'
  | 'expired'
  | 'superseded';

export type EstimateLineType =
  | 'labor'
  | 'part'
  | 'material'
  | 'fee'
  | 'other';

export interface EstimateLineItem {
  id: string; // UUID generated in Main
  type: EstimateLineType;

  description: string;

  /** Scaled quantity (1000 = 1.000 units, 2500 = 2.500 hours) */
  quantityMilli: number;

  /** Unit price in integer cents ($100.00 = 10000) */
  unitPriceCents: number;

  taxable: boolean;

  sourceWorkOrderLaborLineId?: string;
  sourceWorkOrderPartLineId?: string;

  notes?: string;
}

export type EstimateDiscountType = 'fixed' | 'percent';

export interface EstimateRecord {
  id: string; // UUID
  estimateNumber: string; // Monotonic sequential ID, e.g. EST-000001

  workOrderId: string;
  vehicleId: string;
  customerId: string | null;

  customerNameSnapshot?: string;
  vehicleDescriptionSnapshot: string;
  workOrderNumberSnapshot: string;

  status: EstimateStatus;

  lineItems: EstimateLineItem[];

  discountType?: EstimateDiscountType;
  /** Fixed discount in integer cents */
  fixedDiscountCents?: number;
  /** Percentage discount in basis points (1000 = 10.00%, max 10000 = 100.00%) */
  discountPercentBps?: number;

  /** Tax rate in basis points (700 = 7.00%, 0 = 0.00%) */
  taxRateBps: number;

  notes?: string;
  customerMessage?: string;

  /** UTC epoch milliseconds until which the estimate proposal is valid */
  validUntil?: number;

  /** Subtotal of all lines in integer cents */
  subtotalCents: number;
  /** Total discount amount in integer cents */
  discountTotalCents: number;
  /** Taxable subtotal after proportional discount allocation in integer cents */
  taxableSubtotalCents: number;
  /** Total sales tax in integer cents */
  taxTotalCents: number;
  /** Final customer total in integer cents */
  totalCents: number;

  createdAt: number;
  updatedAt: number;
  approvedAt?: number;
  declinedAt?: number;

  isDeleted: boolean;
}

export interface CreateEstimateOptions {
  workOrderId: string;
  notes?: string;
  customerMessage?: string;
  validUntil?: number;
  taxRateBps?: number;
  discountType?: EstimateDiscountType;
  fixedDiscountCents?: number;
  discountPercentBps?: number;

  /** If true, Main loads authoritative Work Order and imports labor and part lines */
  importWorkOrderItems?: boolean;
  /** Default hourly labor rate in integer cents applied when importing labor lines */
  defaultLaborRateCents?: number;

  /** Initial manual line items (used if not importing from Work Order) */
  lineItems?: Array<Omit<EstimateLineItem, 'id'>>;
}

export interface UpdateEstimateOptions {
  notes?: string;
  customerMessage?: string;
  validUntil?: number;
  taxRateBps?: number;
  discountType?: EstimateDiscountType;
  fixedDiscountCents?: number;
  discountPercentBps?: number;
  status?: EstimateStatus;
  lineItems?: Array<Omit<EstimateLineItem, 'id'> & { id?: string }>;
}

export interface ListEstimatesFilter {
  workOrderId?: string;
  vehicleId?: string;
  customerId?: string;
  status?: EstimateStatus;
  search?: string;
  includeDeleted?: boolean;
}

export interface EstimatesBridge {
  list: (filter?: ListEstimatesFilter) => Promise<EstimateRecord[]>;
  get: (id: string) => Promise<EstimateRecord | null>;
  create: (options: CreateEstimateOptions) => Promise<EstimateRecord>;
  update: (id: string, updates: UpdateEstimateOptions) => Promise<EstimateRecord>;
  reopen: (id: string) => Promise<EstimateRecord>;
  delete: (id: string) => Promise<boolean>;
}

export interface IEstimateStorageRepository {
  listEstimates(filter?: ListEstimatesFilter): Promise<EstimateRecord[]>;
  getEstimate(id: string): Promise<EstimateRecord | null>;
  createEstimate(options: CreateEstimateOptions): Promise<EstimateRecord>;
  updateEstimate(id: string, updates: UpdateEstimateOptions): Promise<EstimateRecord>;
  reopenEstimate(id: string): Promise<EstimateRecord>;
  deleteEstimate(id: string): Promise<boolean>;
}
