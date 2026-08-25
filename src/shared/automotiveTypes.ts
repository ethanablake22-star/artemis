import type {
  EstimateRecord,
  CreateEstimateOptions,
  UpdateEstimateOptions,
  ListEstimatesFilter,
  EstimatesBridge,
} from './estimateTypes';

import type {
  InvoiceRecord,
  CreateInvoiceOptions,
  UpdateInvoiceOptions,
  ListInvoicesFilter,
  InvoicesBridge,
} from './invoiceTypes';

export * from './estimateTypes';
export * from './invoiceTypes';

export type CustomerType = 'individual' | 'business';

export interface CustomerRecord {
  id: string; // UUID
  customerNumber: string; // Monotonic sequential ID, e.g. CUS-000001
  type: CustomerType;
  name: string;
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
  id: string; // UUID
  vehicleNumber: string; // Monotonic sequential ID, e.g. VEH-000001
  customerId: string | null; // Nullable: vehicle can be unassigned/shop-owned
  year?: number;
  make: string;
  model: string;
  trim?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  vin?: string;
  licensePlate?: string;
  mileage?: number;
  color?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}

export type WorkOrderStatus =
  | 'draft'
  | 'open'
  | 'diagnosing'
  | 'awaiting_approval'
  | 'waiting_parts'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface WorkOrderLaborLine {
  id: string; // Unique line UUID
  description: string;
  hours?: number;
  technician?: string;
  notes?: string;
}

export interface WorkOrderPartLine {
  id: string; // Unique line UUID
  description: string;
  partNumber?: string;
  quantity: number; // Strictly positive integer
  notes?: string;
}

export interface WorkOrderRecord {
  id: string; // UUID
  workOrderNumber: string; // Monotonic sequential ID, e.g. WO-000001

  /** Immutable relationship to vehicle record */
  vehicleId: string;
  /** Linked customer ID at the time of work order creation, or null */
  customerId: string | null;

  /** Immutable historical snapshot of customer display name at creation */
  customerNameSnapshot?: string;
  /** Immutable historical snapshot of vehicle description (e.g. "2006 Mercedes SL500 AMG") */
  vehicleDescriptionSnapshot: string;
  /** Immutable historical snapshot of vehicle VIN at creation */
  vinSnapshot?: string;

  /** Operational lifecycle status */
  status: WorkOrderStatus;

  /** Odometer reading at intake */
  odometerIn?: number;
  /** Odometer reading upon service completion */
  odometerOut?: number;

  /** Primary customer complaint / reason for service */
  customerConcern: string;
  /** Technician initial inspection / multi-point inspection notes */
  inspectionNotes?: string;
  /** Diagnostic findings, trouble codes, or root causes */
  diagnosis?: string;
  /** Summary of actual repair operations performed */
  workPerformed?: string;
  /** Internal technician notes, torque specs, or follow-up recommendations */
  technicianNotes?: string;

  /** Ordered list of labor operations */
  laborLines: WorkOrderLaborLine[];
  /** Ordered list of required parts and components */
  partLines: WorkOrderPartLine[];

  /** Timestamp when work order was opened (epoch ms) */
  openedAt: number;
  /** Timestamp when work order reached completed status (epoch ms) */
  completedAt?: number;
  /** Record creation timestamp (epoch ms) */
  createdAt: number;
  /** Last update timestamp (epoch ms) */
  updatedAt: number;
  /** Soft-deletion flag */
  isDeleted: boolean;
}

export interface ArtemisAutomotiveStoreData {
  schemaVersion: 5;
  nextCustomerSequence: number;
  nextVehicleSequence: number;
  nextWorkOrderSequence: number;
  nextEstimateSequence: number;
  nextInvoiceSequence: number;
  customers: CustomerRecord[];
  vehicles: VehicleRecord[];
  workOrders: WorkOrderRecord[];
  estimates: EstimateRecord[];
  invoices: InvoiceRecord[];
}

export interface CreateCustomerOptions {
  type?: CustomerType;
  name?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerOptions {
  type?: CustomerType;
  name?: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface CreateVehicleOptions {
  customerId?: string | null;
  make: string;
  model: string;
  year?: number;
  vin?: string;
  trim?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  licensePlate?: string;
  mileage?: number;
  color?: string;
  notes?: string;
}

export interface UpdateVehicleOptions {
  customerId?: string | null;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  trim?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  licensePlate?: string;
  mileage?: number;
  color?: string;
  notes?: string;
}

export interface CreateWorkOrderOptions {
  vehicleId: string;
  customerId?: string | null;
  status?: WorkOrderStatus;
  odometerIn?: number;
  odometerOut?: number;
  customerConcern: string;
  inspectionNotes?: string;
  diagnosis?: string;
  workPerformed?: string;
  technicianNotes?: string;
  laborLines?: Omit<WorkOrderLaborLine, 'id'>[];
  partLines?: Omit<WorkOrderPartLine, 'id'>[];
}

export interface UpdateWorkOrderOptions {
  customerId?: string | null;
  status?: WorkOrderStatus;
  odometerIn?: number;
  odometerOut?: number;
  customerConcern?: string;
  inspectionNotes?: string;
  diagnosis?: string;
  workPerformed?: string;
  technicianNotes?: string;
  laborLines?: (WorkOrderLaborLine | Omit<WorkOrderLaborLine, 'id'>)[];
  partLines?: (WorkOrderPartLine | Omit<WorkOrderPartLine, 'id'>)[];
}

export interface ListCustomersFilter {
  query?: string;
  type?: CustomerType;
  includeDeleted?: boolean;
}

export interface ListVehiclesFilter {
  customerId?: string | null;
  query?: string;
  includeDeleted?: boolean;
}

export interface ListWorkOrdersFilter {
  vehicleId?: string;
  customerId?: string | null;
  status?: WorkOrderStatus;
  query?: string;
  includeDeleted?: boolean;
}

export interface AutomotiveBridge {
  listCustomers: (filter?: ListCustomersFilter) => Promise<CustomerRecord[]>;
  getCustomer: (id: string) => Promise<CustomerRecord | null>;
  createCustomer: (options: CreateCustomerOptions) => Promise<CustomerRecord>;
  updateCustomer: (id: string, updates: UpdateCustomerOptions) => Promise<CustomerRecord>;
  deleteCustomer: (id: string) => Promise<boolean>;

  listVehicles: (filter?: ListVehiclesFilter) => Promise<VehicleRecord[]>;
  getVehicle: (id: string) => Promise<VehicleRecord | null>;
  createVehicle: (options: CreateVehicleOptions) => Promise<VehicleRecord>;
  updateVehicle: (id: string, updates: UpdateVehicleOptions) => Promise<VehicleRecord>;
  deleteVehicle: (id: string) => Promise<boolean>;

  listWorkOrders: (filter?: ListWorkOrdersFilter) => Promise<WorkOrderRecord[]>;
  getWorkOrder: (id: string) => Promise<WorkOrderRecord | null>;
  createWorkOrder: (options: CreateWorkOrderOptions) => Promise<WorkOrderRecord>;
  updateWorkOrder: (id: string, updates: UpdateWorkOrderOptions) => Promise<WorkOrderRecord>;
  deleteWorkOrder: (id: string) => Promise<boolean>;

  estimates: EstimatesBridge;
  invoices: InvoicesBridge;
}

export interface IAutomotiveStorageRepository {
  listCustomers(filter?: ListCustomersFilter): Promise<CustomerRecord[]>;
  getCustomer(id: string): Promise<CustomerRecord | null>;
  createCustomer(options: CreateCustomerOptions): Promise<CustomerRecord>;
  updateCustomer(id: string, updates: UpdateCustomerOptions): Promise<CustomerRecord>;
  deleteCustomer(id: string): Promise<boolean>;

  listVehicles(filter?: ListVehiclesFilter): Promise<VehicleRecord[]>;
  getVehicle(id: string): Promise<VehicleRecord | null>;
  createVehicle(options: CreateVehicleOptions): Promise<VehicleRecord>;
  updateVehicle(id: string, updates: UpdateVehicleOptions): Promise<VehicleRecord>;
  deleteVehicle(id: string): Promise<boolean>;

  listWorkOrders(filter?: ListWorkOrdersFilter): Promise<WorkOrderRecord[]>;
  getWorkOrder(id: string): Promise<WorkOrderRecord | null>;
  createWorkOrder(options: CreateWorkOrderOptions): Promise<WorkOrderRecord>;
  updateWorkOrder(id: string, updates: UpdateWorkOrderOptions): Promise<WorkOrderRecord>;
  deleteWorkOrder(id: string): Promise<boolean>;

  listEstimates(filter?: ListEstimatesFilter): Promise<EstimateRecord[]>;
  getEstimate(id: string): Promise<EstimateRecord | null>;
  createEstimate(options: CreateEstimateOptions): Promise<EstimateRecord>;
  updateEstimate(id: string, updates: UpdateEstimateOptions): Promise<EstimateRecord>;
  reopenEstimate(id: string): Promise<EstimateRecord>;
  deleteEstimate(id: string): Promise<boolean>;

  listInvoices(filter?: ListInvoicesFilter): Promise<InvoiceRecord[]>;
  getInvoice(id: string): Promise<InvoiceRecord | null>;
  createInvoice(options: CreateInvoiceOptions): Promise<InvoiceRecord>;
  updateInvoice(id: string, updates: UpdateInvoiceOptions): Promise<InvoiceRecord>;
  issueInvoice(id: string): Promise<InvoiceRecord>;
  voidInvoice(id: string, reason: string): Promise<InvoiceRecord>;
  deleteInvoice(id: string): Promise<boolean>;
}
