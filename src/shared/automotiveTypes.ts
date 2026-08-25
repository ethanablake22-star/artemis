export interface CustomerRecord {
  /** Stable UUID generated authoritatively in Electron Main */
  id: string;
  /** Full customer name or company name */
  name: string;
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
  /** Stable UUID generated authoritatively in Electron Main */
  id: string;
  /** Foreign key referencing CustomerRecord.id */
  customerId: string;
  /** 17-character VIN or custom identifier */
  vin?: string;
  /** Model year (e.g. 2006) */
  year: number;
  /** Vehicle make (e.g. Mercedes, Honda, Ford) */
  make: string;
  /** Vehicle model (e.g. SL500, Civic, F-150) */
  model: string;
  /** Sub-model or trim (e.g. AMG, EX, Lariat) */
  trim?: string;
  /** State license plate number */
  licensePlate?: string;
  /** Current vehicle odometer mileage */
  mileage?: number;
  /** Exterior color */
  color?: string;
  /** Engine / transmission / specs notes */
  notes?: string;
  /** Record creation timestamp in milliseconds (epoch) */
  createdAt: number;
  /** Last update timestamp in milliseconds (epoch) */
  updatedAt: number;
  /** Soft-deletion flag */
  isDeleted: boolean;
}

export interface ArtemisAutomotiveStoreData {
  schemaVersion: 1;
  customers: CustomerRecord[];
  vehicles: VehicleRecord[];
}

export interface CreateCustomerOptions {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerOptions {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface CreateVehicleOptions {
  customerId: string;
  year: number;
  make: string;
  model: string;
  vin?: string;
  trim?: string;
  licensePlate?: string;
  mileage?: number;
  color?: string;
  notes?: string;
}

export interface UpdateVehicleOptions {
  customerId?: string;
  year?: number;
  make?: string;
  model?: string;
  vin?: string;
  trim?: string;
  licensePlate?: string;
  mileage?: number;
  color?: string;
  notes?: string;
}

export interface ListCustomersFilter {
  query?: string;
  includeDeleted?: boolean;
}

export interface ListVehiclesFilter {
  customerId?: string;
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
