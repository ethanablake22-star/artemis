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
  /** Drivetrain configuration (e.g. "RWD", "AWD", "4WD", "FWD") */
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

export interface ArtemisAutomotiveStoreData {
  schemaVersion: 2;
  nextCustomerSequence: number;
  nextVehicleSequence: number;
  customers: CustomerRecord[];
  vehicles: VehicleRecord[];
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
}
