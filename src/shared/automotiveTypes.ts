export type CustomerType = 'individual' | 'business';

export interface CustomerRecord {
  /** Stable immutable UUID generated authoritatively in Electron Main */
  id: string;
  /** Authoritative human-facing sequential customer number (e.g. CUS-000001) */
  customerNumber: string;
  /** Customer type: individual person or commercial business entity */
  type: CustomerType;
  /** Primary display name (derived authoritatively by Main from first+last or businessName) */
  name: string;
  /** Individual first name */
  firstName?: string;
  /** Individual last name */
  lastName?: string;
  /** Business entity legal / trade name */
  businessName?: string;
  /** Primary point of contact for business accounts */
  contactPerson?: string;
  /** Contact phone number */
  phone?: string;
  /** Contact email address */
  email?: string;
  /** Physical / billing address */
  address?: string;
  /** Customer-level notes, preferences, or account info */
  notes?: string;
  /** Record creation timestamp in milliseconds (epoch) */
  createdAt: number;
  /** Last update timestamp in milliseconds (epoch) */
  updatedAt: number;
  /** Soft-deletion flag */
  isDeleted: boolean;
}

export interface VehicleRecord {
  /** Stable immutable UUID generated authoritatively in Electron Main */
  id: string;
  /** Authoritative human-facing sequential vehicle number (e.g. VEH-000001) */
  vehicleNumber: string;
  /** Foreign key referencing CustomerRecord.id, or null if unassigned/shop/project vehicle */
  customerId: string | null;
  /** 17-character VIN or custom identifier (normalized uppercase, globally unique) */
  vin?: string;
  /** Model year (e.g. 2006, optional) */
  year?: number;
  /** Vehicle make (e.g. Mercedes, Honda, Ford) */
  make: string;
  /** Vehicle model (e.g. SL500, Civic, F-150) */
  model: string;
  /** Sub-model or trim (e.g. AMG, EX, Lariat) */
  trim?: string;
  /** Engine specifications (e.g. "5.0L V8 M113") */
  engine?: string;
  /** Transmission specifications (e.g. "722.9 7-Speed Automatic") */
  transmission?: string;
  /** Drivetrain configuration (e.g. "RWD", "AWD", "4WD", "FWD", "EV") */
  drivetrain?: string;
  /** State license plate number */
  licensePlate?: string;
  /** Current vehicle odometer mileage */
  mileage?: number;
  /** Exterior color */
  color?: string;
  /** General vehicle notes */
  notes?: string;
  /** Record creation timestamp in milliseconds (epoch) */
  createdAt: number;
  /** Last update timestamp in milliseconds (epoch) */
  updatedAt: number;
  /** Soft-deletion flag */
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
  /** Immutable line item UUID generated in Electron Main */
  id: string;
  /** Labor description (e.g. "Front brake pad and rotor replacement") */
  description: string;
  /** Labor time in hours (work/time only, no labor rates in V0.0.5) */
  hours?: number;
  /** Technician notes or instructions specific to this labor operation */
  notes?: string;
}

export interface WorkOrderPartLine {
  /** Immutable line item UUID generated in Electron Main */
  id: string;
  /** Part item description (e.g. "Ceramic Front Brake Pads") */
  description: string;
  /** Manufacturer / OEM / Aftermarket Part Number */
  partNumber?: string;
  /** Part quantity required/installed (greater than zero, no pricing in V0.0.5) */
  quantity: number;
  /** Specific part notes, brand, or bin location */
  notes?: string;
}

export interface WorkOrderRecord {
  /** Stable immutable UUID generated authoritatively in Electron Main */
  id: string;
  /** Authoritative human-facing sequential work order number (e.g. WO-000001) */
  workOrderNumber: string;

  /** Foreign key referencing VehicleRecord.id */
  vehicleId: string;
  /** Foreign key referencing CustomerRecord.id at time of intake, or null */
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
  schemaVersion: 3;
  nextCustomerSequence: number;
  nextVehicleSequence: number;
  nextWorkOrderSequence: number;
  customers: CustomerRecord[];
  vehicles: VehicleRecord[];
  workOrders: WorkOrderRecord[];
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
}
