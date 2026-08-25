import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  CustomerRecord,
  VehicleRecord,
  WorkOrderRecord,
  WorkOrderLaborLine,
  WorkOrderPartLine,
  EstimateRecord,
  EstimateLineItem,
  InvoiceRecord,
  InvoiceLineItem,
  ArtemisAutomotiveStoreData,
  CreateCustomerOptions,
  UpdateCustomerOptions,
  CreateVehicleOptions,
  UpdateVehicleOptions,
  CreateWorkOrderOptions,
  UpdateWorkOrderOptions,
  CreateEstimateOptions,
  UpdateEstimateOptions,
  CreateInvoiceOptions,
  UpdateInvoiceOptions,
  ListCustomersFilter,
  ListVehiclesFilter,
  ListWorkOrdersFilter,
  ListEstimatesFilter,
  ListInvoicesFilter,
} from '../shared/automotiveTypes';
import { calculateEstimateTotals } from '../shared/currencyUtils';

export const CURRENT_AUTOMOTIVE_SCHEMA_VERSION = 5;
const AUTOMOTIVE_STORE_FILENAME = 'artemis_automotive_store.json';

export class UnsupportedAutomotiveSchemaVersionError extends Error {
  constructor(public version: number) {
    super(`Unsupported automotive schema version: ${version}. Please update Artemis.`);
    this.name = 'UnsupportedAutomotiveSchemaVersionError';
  }
}

function getAutomotiveStoreFilePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, AUTOMOTIVE_STORE_FILENAME);
}

function formatCustomerNumber(seq: number): string {
  return `CUS-${String(seq).padStart(6, '0')}`;
}

function formatVehicleNumber(seq: number): string {
  return `VEH-${String(seq).padStart(6, '0')}`;
}

function formatWorkOrderNumber(seq: number): string {
  return `WO-${String(seq).padStart(6, '0')}`;
}

function formatEstimateNumber(seq: number): string {
  return `EST-${String(seq).padStart(6, '0')}`;
}

function formatInvoiceNumber(seq: number): string {
  return `INV-${String(seq).padStart(6, '0')}`;
}

function deriveCustomerName(
  type: 'individual' | 'business',
  options: {
    name?: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
  }
): string {
  if (type === 'individual') {
    const parts = [options.firstName?.trim(), options.lastName?.trim()].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
  } else if (type === 'business') {
    if (options.businessName?.trim()) {
      return options.businessName.trim();
    }
  }

  return options.name?.trim() || '';
}

function validateAndMigrateAutomotiveStore(raw: unknown): ArtemisAutomotiveStoreData {
  if (!raw || typeof raw !== 'object') {
    return {
      schemaVersion: 5,
      nextCustomerSequence: 1,
      nextVehicleSequence: 1,
      nextWorkOrderSequence: 1,
      nextEstimateSequence: 1,
      nextInvoiceSequence: 1,
      customers: [],
      vehicles: [],
      workOrders: [],
      estimates: [],
      invoices: [],
    };
  }

  const obj = raw as Record<string, unknown>;
  const version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1;

  switch (version) {
    case 1: {
      // Deterministic migration from Schema 1 -> Schema 5
      const rawCustomers = Array.isArray(obj.customers)
        ? (obj.customers as Record<string, unknown>[])
        : [];
      const rawVehicles = Array.isArray(obj.vehicles)
        ? (obj.vehicles as Record<string, unknown>[])
        : [];

      const sortedCustomers = [...rawCustomers].sort((a, b) => {
        const timeDiff = ((a.createdAt as number) || 0) - ((b.createdAt as number) || 0);
        if (timeDiff !== 0) return timeDiff;
        return String(a.id || '').localeCompare(String(b.id || ''));
      });

      const migratedCustomers: CustomerRecord[] = sortedCustomers.map((c, index) => {
        const seq = index + 1;
        const name = String(c.name || 'Unnamed Customer').trim();
        return {
          id: String(c.id || crypto.randomUUID()),
          customerNumber: formatCustomerNumber(seq),
          type: 'individual',
          name,
          phone: c.phone ? String(c.phone).trim() : undefined,
          email: c.email ? String(c.email).trim() : undefined,
          address: c.address ? String(c.address).trim() : undefined,
          notes: c.notes ? String(c.notes).trim() : undefined,
          createdAt: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
          updatedAt: typeof c.updatedAt === 'number' ? c.updatedAt : Date.now(),
          isDeleted: Boolean(c.isDeleted),
        };
      });

      const sortedVehicles = [...rawVehicles].sort((a, b) => {
        const timeDiff = ((a.createdAt as number) || 0) - ((b.createdAt as number) || 0);
        if (timeDiff !== 0) return timeDiff;
        return String(a.id || '').localeCompare(String(b.id || ''));
      });

      const migratedVehicles: VehicleRecord[] = sortedVehicles.map((v, index) => {
        const seq = index + 1;
        const vin = v.vin ? String(v.vin).trim().toUpperCase() : undefined;
        return {
          id: String(v.id || crypto.randomUUID()),
          vehicleNumber: formatVehicleNumber(seq),
          customerId: v.customerId ? String(v.customerId) : null,
          year: typeof v.year === 'number' ? v.year : undefined,
          make: String(v.make || 'Unknown Make').trim(),
          model: String(v.model || 'Unknown Model').trim(),
          trim: v.trim ? String(v.trim).trim() : undefined,
          vin,
          licensePlate: v.licensePlate ? String(v.licensePlate).trim().toUpperCase() : undefined,
          mileage: typeof v.mileage === 'number' ? v.mileage : undefined,
          color: v.color ? String(v.color).trim() : undefined,
          notes: v.notes ? String(v.notes).trim() : undefined,
          createdAt: typeof v.createdAt === 'number' ? v.createdAt : Date.now(),
          updatedAt: typeof v.updatedAt === 'number' ? v.updatedAt : Date.now(),
          isDeleted: Boolean(v.isDeleted),
        };
      });

      return {
        schemaVersion: 5,
        nextCustomerSequence: migratedCustomers.length + 1,
        nextVehicleSequence: migratedVehicles.length + 1,
        nextWorkOrderSequence: 1,
        nextEstimateSequence: 1,
        nextInvoiceSequence: 1,
        customers: migratedCustomers,
        vehicles: migratedVehicles,
        workOrders: [],
        estimates: [],
        invoices: [],
      };
    }

    case 2: {
      // Migration from Schema 2 -> Schema 5
      const customers = Array.isArray(obj.customers)
        ? (obj.customers as CustomerRecord[])
        : [];
      const vehicles = Array.isArray(obj.vehicles)
        ? (obj.vehicles as VehicleRecord[])
        : [];
      const nextCustomerSequence =
        typeof obj.nextCustomerSequence === 'number'
          ? obj.nextCustomerSequence
          : customers.length + 1;
      const nextVehicleSequence =
        typeof obj.nextVehicleSequence === 'number'
          ? obj.nextVehicleSequence
          : vehicles.length + 1;

      return {
        schemaVersion: 5,
        nextCustomerSequence,
        nextVehicleSequence,
        nextWorkOrderSequence: 1,
        nextEstimateSequence: 1,
        nextInvoiceSequence: 1,
        customers,
        vehicles,
        workOrders: [],
        estimates: [],
        invoices: [],
      };
    }

    case 3: {
      // Migration from Schema 3 -> Schema 5
      const customers = Array.isArray(obj.customers)
        ? (obj.customers as CustomerRecord[])
        : [];
      const vehicles = Array.isArray(obj.vehicles)
        ? (obj.vehicles as VehicleRecord[])
        : [];
      const workOrders = Array.isArray(obj.workOrders)
        ? (obj.workOrders as WorkOrderRecord[])
        : [];

      const nextCustomerSequence =
        typeof obj.nextCustomerSequence === 'number'
          ? obj.nextCustomerSequence
          : customers.length + 1;
      const nextVehicleSequence =
        typeof obj.nextVehicleSequence === 'number'
          ? obj.nextVehicleSequence
          : vehicles.length + 1;
      const nextWorkOrderSequence =
        typeof obj.nextWorkOrderSequence === 'number'
          ? obj.nextWorkOrderSequence
          : workOrders.length + 1;

      return {
        schemaVersion: 5,
        nextCustomerSequence,
        nextVehicleSequence,
        nextWorkOrderSequence,
        nextEstimateSequence: 1,
        nextInvoiceSequence: 1,
        customers,
        vehicles,
        workOrders,
        estimates: [],
        invoices: [],
      };
    }

    case 4: {
      // Migration from Schema 4 -> Schema 5
      const customers = Array.isArray(obj.customers)
        ? (obj.customers as CustomerRecord[])
        : [];
      const vehicles = Array.isArray(obj.vehicles)
        ? (obj.vehicles as VehicleRecord[])
        : [];
      const workOrders = Array.isArray(obj.workOrders)
        ? (obj.workOrders as WorkOrderRecord[])
        : [];
      const estimates = Array.isArray(obj.estimates)
        ? (obj.estimates as EstimateRecord[])
        : [];

      const nextCustomerSequence =
        typeof obj.nextCustomerSequence === 'number'
          ? obj.nextCustomerSequence
          : customers.length + 1;
      const nextVehicleSequence =
        typeof obj.nextVehicleSequence === 'number'
          ? obj.nextVehicleSequence
          : vehicles.length + 1;
      const nextWorkOrderSequence =
        typeof obj.nextWorkOrderSequence === 'number'
          ? obj.nextWorkOrderSequence
          : workOrders.length + 1;
      const nextEstimateSequence =
        typeof obj.nextEstimateSequence === 'number'
          ? obj.nextEstimateSequence
          : estimates.length + 1;

      return {
        schemaVersion: 5,
        nextCustomerSequence,
        nextVehicleSequence,
        nextWorkOrderSequence,
        nextEstimateSequence,
        nextInvoiceSequence: 1,
        customers,
        vehicles,
        workOrders,
        estimates,
        invoices: [],
      };
    }

    case 5: {
      const customers = Array.isArray(obj.customers)
        ? (obj.customers as CustomerRecord[])
        : [];
      const vehicles = Array.isArray(obj.vehicles)
        ? (obj.vehicles as VehicleRecord[])
        : [];
      const workOrders = Array.isArray(obj.workOrders)
        ? (obj.workOrders as WorkOrderRecord[])
        : [];
      const estimates = Array.isArray(obj.estimates)
        ? (obj.estimates as EstimateRecord[])
        : [];
      const invoices = Array.isArray(obj.invoices)
        ? (obj.invoices as InvoiceRecord[])
        : [];

      const nextCustomerSequence =
        typeof obj.nextCustomerSequence === 'number'
          ? obj.nextCustomerSequence
          : customers.length + 1;
      const nextVehicleSequence =
        typeof obj.nextVehicleSequence === 'number'
          ? obj.nextVehicleSequence
          : vehicles.length + 1;
      const nextWorkOrderSequence =
        typeof obj.nextWorkOrderSequence === 'number'
          ? obj.nextWorkOrderSequence
          : workOrders.length + 1;
      const nextEstimateSequence =
        typeof obj.nextEstimateSequence === 'number'
          ? obj.nextEstimateSequence
          : estimates.length + 1;
      const nextInvoiceSequence =
        typeof obj.nextInvoiceSequence === 'number'
          ? obj.nextInvoiceSequence
          : invoices.length + 1;

      return {
        schemaVersion: 5,
        nextCustomerSequence,
        nextVehicleSequence,
        nextWorkOrderSequence,
        nextEstimateSequence,
        nextInvoiceSequence,
        customers,
        vehicles,
        workOrders,
        estimates,
        invoices,
      };
    }

    default: {
      throw new UnsupportedAutomotiveSchemaVersionError(version);
    }
  }
}

let inMemoryCache: ArtemisAutomotiveStoreData | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function readAutomotiveStoreFile(): Promise<ArtemisAutomotiveStoreData> {
  if (inMemoryCache) {
    return inMemoryCache;
  }

  const filePath = getAutomotiveStoreFilePath();
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    const validated = validateAndMigrateAutomotiveStore(parsed);
    inMemoryCache = validated;
    return validated;
  } catch (err: unknown) {
    if (err instanceof UnsupportedAutomotiveSchemaVersionError) {
      throw err;
    }
    const initialStore: ArtemisAutomotiveStoreData = {
      schemaVersion: 5,
      nextCustomerSequence: 1,
      nextVehicleSequence: 1,
      nextWorkOrderSequence: 1,
      nextEstimateSequence: 1,
      nextInvoiceSequence: 1,
      customers: [],
      vehicles: [],
      workOrders: [],
      estimates: [],
      invoices: [],
    };
    await writeAutomotiveStoreFile(initialStore);
    inMemoryCache = initialStore;
    return initialStore;
  }
}

async function writeAutomotiveStoreFile(store: ArtemisAutomotiveStoreData): Promise<void> {
  inMemoryCache = store;

  writeQueue = writeQueue.then(async () => {
    const filePath = getAutomotiveStoreFilePath();
    const tempPath = `${filePath}.tmp.${crypto.randomBytes(4).toString('hex')}`;
    const payload = JSON.stringify(store, null, 2);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tempPath, payload, 'utf-8');
    await fs.rename(tempPath, filePath);
  }).catch((err) => {
    console.error('Failed to write automotive store to disk:', err);
    throw err;
  });

  return writeQueue;
}

// -----------------------------------------------------------------------------
// Authoritative Customer Operations
// -----------------------------------------------------------------------------

export async function listCustomers(filter?: ListCustomersFilter): Promise<CustomerRecord[]> {
  const store = await readAutomotiveStoreFile();
  let results = store.customers;

  if (!filter?.includeDeleted) {
    results = results.filter((c) => !c.isDeleted);
  }

  if (filter?.type) {
    results = results.filter((c) => c.type === filter.type);
  }

  if (filter?.query && filter.query.trim()) {
    const q = filter.query.toLowerCase().trim();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.customerNumber.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.businessName && c.businessName.toLowerCase().includes(q)) ||
        (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
    );
  }

  return results.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getCustomer(id: string): Promise<CustomerRecord | null> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid customer ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const found = store.customers.find((c) => c.id === id);
  return found || null;
}

export async function createCustomer(options: CreateCustomerOptions): Promise<CustomerRecord> {
  const type = options.type || 'individual';
  const name = deriveCustomerName(type, options);

  if (!name) {
    throw new Error(
      type === 'business'
        ? 'Business name is required'
        : 'Customer name or first/last name is required'
    );
  }

  const store = await readAutomotiveStoreFile();
  const seq = store.nextCustomerSequence++;
  const customerNumber = formatCustomerNumber(seq);
  const now = Date.now();

  const newCustomer: CustomerRecord = {
    id: crypto.randomUUID(),
    customerNumber,
    type,
    name,
    firstName: options.firstName?.trim() || undefined,
    lastName: options.lastName?.trim() || undefined,
    businessName: options.businessName?.trim() || undefined,
    contactPerson: options.contactPerson?.trim() || undefined,
    phone: options.phone?.trim() || undefined,
    email: options.email?.trim() || undefined,
    address: options.address?.trim() || undefined,
    notes: options.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  store.customers.push(newCustomer);
  await writeAutomotiveStoreFile(store);
  return newCustomer;
}

export async function updateCustomer(
  id: string,
  updates: UpdateCustomerOptions
): Promise<CustomerRecord> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid customer ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const customer = store.customers.find((c) => c.id === id);

  if (!customer) {
    throw new Error(`Customer "${id}" not found`);
  }

  if (customer.isDeleted) {
    throw new Error(`Cannot update customer "${id}": record is deleted`);
  }

  if (updates.type !== undefined) customer.type = updates.type;
  if (updates.firstName !== undefined) customer.firstName = updates.firstName.trim() || undefined;
  if (updates.lastName !== undefined) customer.lastName = updates.lastName.trim() || undefined;
  if (updates.businessName !== undefined) customer.businessName = updates.businessName.trim() || undefined;
  if (updates.contactPerson !== undefined) customer.contactPerson = updates.contactPerson.trim() || undefined;

  // Authoritatively derive / synchronize display name
  const updatedName = deriveCustomerName(customer.type, {
    name: updates.name,
    firstName: customer.firstName,
    lastName: customer.lastName,
    businessName: customer.businessName,
  });

  if (!updatedName) {
    throw new Error('Customer name cannot be empty');
  }
  customer.name = updatedName;

  if (updates.phone !== undefined) customer.phone = updates.phone.trim() || undefined;
  if (updates.email !== undefined) customer.email = updates.email.trim() || undefined;
  if (updates.address !== undefined) customer.address = updates.address.trim() || undefined;
  if (updates.notes !== undefined) customer.notes = updates.notes.trim() || undefined;

  customer.updatedAt = Date.now();
  await writeAutomotiveStoreFile(store);
  return customer;
}

export async function deleteCustomer(id: string): Promise<boolean> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid customer ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const customer = store.customers.find((c) => c.id === id);

  if (!customer) {
    throw new Error(`Customer "${id}" not found`);
  }

  const now = Date.now();
  customer.isDeleted = true;
  customer.updatedAt = now;

  // Soft-deleting customer does not delete vehicles or work orders
  await writeAutomotiveStoreFile(store);
  return true;
}

// -----------------------------------------------------------------------------
// Authoritative Vehicle Operations
// -----------------------------------------------------------------------------

export async function listVehicles(filter?: ListVehiclesFilter): Promise<VehicleRecord[]> {
  const store = await readAutomotiveStoreFile();
  let results = store.vehicles;

  if (!filter?.includeDeleted) {
    results = results.filter((v) => !v.isDeleted);
  }

  if (filter?.customerId !== undefined) {
    results = results.filter((v) => v.customerId === filter.customerId);
  }

  if (filter?.query && filter.query.trim()) {
    const q = filter.query.toLowerCase().trim();
    results = results.filter(
      (v) =>
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.vehicleNumber.toLowerCase().includes(q) ||
        (v.year && String(v.year).includes(q)) ||
        (v.vin && v.vin.toLowerCase().includes(q)) ||
        (v.licensePlate && v.licensePlate.toLowerCase().includes(q)) ||
        (v.trim && v.trim.toLowerCase().includes(q)) ||
        (v.engine && v.engine.toLowerCase().includes(q)) ||
        (v.transmission && v.transmission.toLowerCase().includes(q)) ||
        (v.drivetrain && v.drivetrain.toLowerCase().includes(q)) ||
        (v.notes && v.notes.toLowerCase().includes(q))
    );
  }

  return results.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getVehicle(id: string): Promise<VehicleRecord | null> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid vehicle ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const found = store.vehicles.find((v) => v.id === id);
  return found || null;
}

export async function createVehicle(options: CreateVehicleOptions): Promise<VehicleRecord> {
  const { customerId, make, model, year } = options;

  const trimmedMake = make?.trim();
  const trimmedModel = model?.trim();

  if (!trimmedMake) throw new Error('Vehicle make cannot be empty');
  if (!trimmedModel) throw new Error('Vehicle model cannot be empty');

  if (year !== undefined && year !== null) {
    if (typeof year !== 'number' || year < 1900 || year > 2100) {
      throw new Error('Vehicle year must be a valid 4-digit number between 1900 and 2100');
    }
  }

  const store = await readAutomotiveStoreFile();

  // Validate customerId if non-null
  let assignedCustomerId: string | null = null;
  if (customerId) {
    const customer = store.customers.find((c) => c.id === customerId);
    if (!customer) {
      throw new Error(`Customer "${customerId}" does not exist`);
    }
    if (customer.isDeleted) {
      throw new Error(`Cannot assign vehicle to deleted customer "${customerId}"`);
    }
    assignedCustomerId = customerId;
  }

  // Enforce global VIN uniqueness across all vehicles (including soft-deleted)
  let normalizedVin: string | undefined = undefined;
  if (options.vin && options.vin.trim()) {
    normalizedVin = options.vin.trim().toUpperCase();
    const existingVehicleWithVin = store.vehicles.find((v) => v.vin === normalizedVin);
    if (existingVehicleWithVin) {
      throw new Error(`A vehicle with VIN "${normalizedVin}" already exists in the system (${existingVehicleWithVin.vehicleNumber}).`);
    }
  }

  const seq = store.nextVehicleSequence++;
  const vehicleNumber = formatVehicleNumber(seq);
  const now = Date.now();

  const newVehicle: VehicleRecord = {
    id: crypto.randomUUID(),
    vehicleNumber,
    customerId: assignedCustomerId,
    year: year || undefined,
    make: trimmedMake,
    model: trimmedModel,
    trim: options.trim?.trim() || undefined,
    vin: normalizedVin,
    engine: options.engine?.trim() || undefined,
    transmission: options.transmission?.trim() || undefined,
    drivetrain: options.drivetrain?.trim() || undefined,
    licensePlate: options.licensePlate?.trim().toUpperCase() || undefined,
    mileage: typeof options.mileage === 'number' && options.mileage >= 0 ? options.mileage : undefined,
    color: options.color?.trim() || undefined,
    notes: options.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  store.vehicles.push(newVehicle);
  await writeAutomotiveStoreFile(store);
  return newVehicle;
}

export async function updateVehicle(
  id: string,
  updates: UpdateVehicleOptions
): Promise<VehicleRecord> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid vehicle ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const vehicle = store.vehicles.find((v) => v.id === id);

  if (!vehicle) {
    throw new Error(`Vehicle "${id}" not found`);
  }

  if (vehicle.isDeleted) {
    throw new Error(`Cannot update vehicle "${id}": record is deleted`);
  }

  if (updates.customerId !== undefined) {
    if (updates.customerId === null) {
      vehicle.customerId = null;
    } else {
      const customer = store.customers.find((c) => c.id === updates.customerId);
      if (!customer || customer.isDeleted) {
        throw new Error(`Target customer "${updates.customerId}" not found or is deleted`);
      }
      vehicle.customerId = updates.customerId;
    }
  }

  if (updates.year !== undefined) {
    if (updates.year !== null) {
      if (typeof updates.year !== 'number' || updates.year < 1900 || updates.year > 2100) {
        throw new Error('Invalid vehicle year');
      }
      vehicle.year = updates.year;
    } else {
      vehicle.year = undefined;
    }
  }

  if (updates.make !== undefined) {
    const trimmed = updates.make.trim();
    if (!trimmed) throw new Error('Vehicle make cannot be empty');
    vehicle.make = trimmed;
  }

  if (updates.model !== undefined) {
    const trimmed = updates.model.trim();
    if (!trimmed) throw new Error('Vehicle model cannot be empty');
    vehicle.model = trimmed;
  }

  if (updates.vin !== undefined) {
    if (updates.vin && updates.vin.trim()) {
      const normalizedVin = updates.vin.trim().toUpperCase();
      const existingVehicleWithVin = store.vehicles.find(
        (v) => v.vin === normalizedVin && v.id !== id
      );
      if (existingVehicleWithVin) {
        throw new Error(
          `A vehicle with VIN "${normalizedVin}" already exists in the system (${existingVehicleWithVin.vehicleNumber}).`
        );
      }
      vehicle.vin = normalizedVin;
    } else {
      vehicle.vin = undefined;
    }
  }

  if (updates.trim !== undefined) vehicle.trim = updates.trim.trim() || undefined;
  if (updates.engine !== undefined) vehicle.engine = updates.engine.trim() || undefined;
  if (updates.transmission !== undefined) vehicle.transmission = updates.transmission.trim() || undefined;
  if (updates.drivetrain !== undefined) vehicle.drivetrain = updates.drivetrain.trim() || undefined;
  if (updates.licensePlate !== undefined) vehicle.licensePlate = updates.licensePlate.trim().toUpperCase() || undefined;
  if (updates.mileage !== undefined) vehicle.mileage = typeof updates.mileage === 'number' && updates.mileage >= 0 ? updates.mileage : undefined;
  if (updates.color !== undefined) vehicle.color = updates.color.trim() || undefined;
  if (updates.notes !== undefined) vehicle.notes = updates.notes.trim() || undefined;

  vehicle.updatedAt = Date.now();
  await writeAutomotiveStoreFile(store);
  return vehicle;
}

export async function deleteVehicle(id: string): Promise<boolean> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid vehicle ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const vehicle = store.vehicles.find((v) => v.id === id);

  if (!vehicle) {
    throw new Error(`Vehicle "${id}" not found`);
  }

  vehicle.isDeleted = true;
  vehicle.updatedAt = Date.now();
  await writeAutomotiveStoreFile(store);
  return true;
}

// -----------------------------------------------------------------------------
// Authoritative Work Order Operations (V0.0.5)
// -----------------------------------------------------------------------------

export async function listWorkOrders(filter?: ListWorkOrdersFilter): Promise<WorkOrderRecord[]> {
  const store = await readAutomotiveStoreFile();
  let results = store.workOrders || [];

  if (!filter?.includeDeleted) {
    results = results.filter((w) => !w.isDeleted);
  }

  if (filter?.vehicleId) {
    results = results.filter((w) => w.vehicleId === filter.vehicleId);
  }

  if (filter?.customerId !== undefined) {
    results = results.filter((w) => w.customerId === filter.customerId);
  }

  if (filter?.status) {
    results = results.filter((w) => w.status === filter.status);
  }

  if (filter?.query && filter.query.trim()) {
    const q = filter.query.toLowerCase().trim();
    results = results.filter(
      (w) =>
        w.workOrderNumber.toLowerCase().includes(q) ||
        w.customerConcern.toLowerCase().includes(q) ||
        (w.customerNameSnapshot && w.customerNameSnapshot.toLowerCase().includes(q)) ||
        w.vehicleDescriptionSnapshot.toLowerCase().includes(q) ||
        (w.vinSnapshot && w.vinSnapshot.toLowerCase().includes(q)) ||
        w.status.toLowerCase().includes(q) ||
        (w.inspectionNotes && w.inspectionNotes.toLowerCase().includes(q)) ||
        (w.diagnosis && w.diagnosis.toLowerCase().includes(q)) ||
        (w.workPerformed && w.workPerformed.toLowerCase().includes(q)) ||
        (w.technicianNotes && w.technicianNotes.toLowerCase().includes(q))
    );
  }

  return results.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getWorkOrder(id: string): Promise<WorkOrderRecord | null> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid work order ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const found = (store.workOrders || []).find((w) => w.id === id);
  return found || null;
}

export async function createWorkOrder(options: CreateWorkOrderOptions): Promise<WorkOrderRecord> {
  const { vehicleId, customerId, customerConcern } = options;

  if (!vehicleId || typeof vehicleId !== 'string') {
    throw new Error('Vehicle ID is required to create a Work Order');
  }

  const status = options.status || 'open';
  const trimmedConcern = customerConcern?.trim() || '';
  if (status !== 'draft' && !trimmedConcern) {
    throw new Error('Customer concern / reason for service is required for active work orders');
  }

  if (options.odometerIn !== undefined && options.odometerIn !== null) {
    if (typeof options.odometerIn !== 'number' || options.odometerIn < 0) {
      throw new Error('Intake odometer reading cannot be negative');
    }
  }

  if (options.odometerOut !== undefined && options.odometerOut !== null) {
    if (typeof options.odometerOut !== 'number' || options.odometerOut < 0) {
      throw new Error('Out odometer reading cannot be negative');
    }
    if (options.odometerIn !== undefined && options.odometerOut < options.odometerIn) {
      throw new Error('Odometer Out cannot be less than Odometer In');
    }
  }

  const store = await readAutomotiveStoreFile();

  // Validate vehicle exists and is not deleted
  const vehicle = store.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) {
    throw new Error(`Vehicle "${vehicleId}" does not exist`);
  }
  if (vehicle.isDeleted) {
    throw new Error(`Cannot open Work Order for archived vehicle "${vehicleId}"`);
  }

  // Capture immutable vehicle description snapshot
  const vehicleDescParts = [
    vehicle.year ? String(vehicle.year) : '',
    vehicle.make,
    vehicle.model,
    vehicle.trim || '',
  ].filter(Boolean);
  const vehicleDescriptionSnapshot = vehicleDescParts.join(' ').trim();
  const vinSnapshot = vehicle.vin;

  // Validate customer (if supplied) and capture customer name snapshot
  let assignedCustomerId: string | null = null;
  let customerNameSnapshot: string | undefined = undefined;

  const targetCustomerId = customerId !== undefined ? customerId : vehicle.customerId;
  if (targetCustomerId) {
    const customer = store.customers.find((c) => c.id === targetCustomerId);
    if (!customer) {
      throw new Error(`Customer "${targetCustomerId}" does not exist`);
    }
    assignedCustomerId = customer.id;
    customerNameSnapshot = customer.name;
  }

  // Validate and sanitize labor lines
  const laborLines: WorkOrderLaborLine[] = [];
  if (Array.isArray(options.laborLines)) {
    for (const line of options.laborLines) {
      const desc = line.description?.trim();
      if (!desc) throw new Error('Labor line description cannot be empty');
      if (line.hours !== undefined && (typeof line.hours !== 'number' || line.hours < 0)) {
        throw new Error('Labor hours cannot be negative');
      }
      laborLines.push({
        id: crypto.randomUUID(),
        description: desc,
        hours: line.hours,
        notes: line.notes?.trim() || undefined,
      });
    }
  }

  // Validate and sanitize parts lines
  const partLines: WorkOrderPartLine[] = [];
  if (Array.isArray(options.partLines)) {
    for (const line of options.partLines) {
      const desc = line.description?.trim();
      if (!desc) throw new Error('Part line description cannot be empty');
      if (typeof line.quantity !== 'number' || line.quantity <= 0) {
        throw new Error('Part quantity must be greater than zero');
      }
      partLines.push({
        id: crypto.randomUUID(),
        description: desc,
        partNumber: line.partNumber?.trim() || undefined,
        quantity: line.quantity,
        notes: line.notes?.trim() || undefined,
      });
    }
  }

  const seq = store.nextWorkOrderSequence++;
  const workOrderNumber = formatWorkOrderNumber(seq);
  const now = Date.now();
  const completedAt = status === 'completed' ? now : undefined;

  const newWorkOrder: WorkOrderRecord = {
    id: crypto.randomUUID(),
    workOrderNumber,
    vehicleId,
    customerId: assignedCustomerId,
    customerNameSnapshot,
    vehicleDescriptionSnapshot,
    vinSnapshot,
    status,
    odometerIn: options.odometerIn !== undefined ? options.odometerIn : vehicle.mileage,
    odometerOut: options.odometerOut,
    customerConcern: trimmedConcern,
    inspectionNotes: options.inspectionNotes?.trim() || undefined,
    diagnosis: options.diagnosis?.trim() || undefined,
    workPerformed: options.workPerformed?.trim() || undefined,
    technicianNotes: options.technicianNotes?.trim() || undefined,
    laborLines,
    partLines,
    openedAt: now,
    completedAt,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  if (!store.workOrders) store.workOrders = [];
  store.workOrders.push(newWorkOrder);
  await writeAutomotiveStoreFile(store);
  return newWorkOrder;
}

export async function updateWorkOrder(
  id: string,
  updates: UpdateWorkOrderOptions
): Promise<WorkOrderRecord> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid work order ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const workOrder = (store.workOrders || []).find((w) => w.id === id);

  if (!workOrder) {
    throw new Error(`Work Order "${id}" not found`);
  }

  if (workOrder.isDeleted) {
    throw new Error(`Cannot update Work Order "${id}": record is deleted`);
  }

  if (updates.customerId !== undefined) {
    if (updates.customerId === null) {
      workOrder.customerId = null;
    } else {
      const customer = store.customers.find((c) => c.id === updates.customerId);
      if (!customer) {
        throw new Error(`Target customer "${updates.customerId}" not found`);
      }
      workOrder.customerId = customer.id;
    }
  }

  const targetStatus = updates.status !== undefined ? updates.status : workOrder.status;

  if (updates.customerConcern !== undefined) {
    const trimmed = updates.customerConcern.trim();
    if (targetStatus !== 'draft' && !trimmed) {
      throw new Error('Customer concern cannot be empty for active work orders');
    }
    workOrder.customerConcern = trimmed;
  }

  if (updates.status !== undefined && updates.status !== 'draft' && !workOrder.customerConcern.trim()) {
    throw new Error('Cannot transition work order out of draft without entering a customer concern');
  }

  if (updates.odometerIn !== undefined) {
    if (updates.odometerIn !== null) {
      if (typeof updates.odometerIn !== 'number' || updates.odometerIn < 0) {
        throw new Error('Intake odometer reading cannot be negative');
      }
      workOrder.odometerIn = updates.odometerIn;
    } else {
      workOrder.odometerIn = undefined;
    }
  }

  if (updates.odometerOut !== undefined) {
    if (updates.odometerOut !== null) {
      if (typeof updates.odometerOut !== 'number' || updates.odometerOut < 0) {
        throw new Error('Out odometer reading cannot be negative');
      }
      if (workOrder.odometerIn !== undefined && updates.odometerOut < workOrder.odometerIn) {
        throw new Error('Odometer Out cannot be less than Odometer In');
      }
      workOrder.odometerOut = updates.odometerOut;
    } else {
      workOrder.odometerOut = undefined;
    }
  }

  if (updates.status !== undefined) {
    const prevStatus = workOrder.status;
    workOrder.status = updates.status;
    if (updates.status === 'completed' && prevStatus !== 'completed') {
      workOrder.completedAt = Date.now();
    } else if (updates.status !== 'completed' && prevStatus === 'completed') {
      workOrder.completedAt = undefined;
    }
  }

  if (updates.inspectionNotes !== undefined) workOrder.inspectionNotes = updates.inspectionNotes.trim() || undefined;
  if (updates.diagnosis !== undefined) workOrder.diagnosis = updates.diagnosis.trim() || undefined;
  if (updates.workPerformed !== undefined) workOrder.workPerformed = updates.workPerformed.trim() || undefined;
  if (updates.technicianNotes !== undefined) workOrder.technicianNotes = updates.technicianNotes.trim() || undefined;

  if (updates.laborLines !== undefined) {
    const validatedLabor: WorkOrderLaborLine[] = [];
    for (const line of updates.laborLines) {
      const desc = line.description?.trim();
      if (!desc) throw new Error('Labor line description cannot be empty');
      if (line.hours !== undefined && (typeof line.hours !== 'number' || line.hours < 0)) {
        throw new Error('Labor hours cannot be negative');
      }
      validatedLabor.push({
        id: 'id' in line && line.id ? line.id : crypto.randomUUID(),
        description: desc,
        hours: line.hours,
        notes: line.notes?.trim() || undefined,
      });
    }
    workOrder.laborLines = validatedLabor;
  }

  if (updates.partLines !== undefined) {
    const validatedParts: WorkOrderPartLine[] = [];
    for (const line of updates.partLines) {
      const desc = line.description?.trim();
      if (!desc) throw new Error('Part line description cannot be empty');
      if (typeof line.quantity !== 'number' || line.quantity <= 0) {
        throw new Error('Part quantity must be greater than zero');
      }
      validatedParts.push({
        id: 'id' in line && line.id ? line.id : crypto.randomUUID(),
        description: desc,
        partNumber: line.partNumber?.trim() || undefined,
        quantity: line.quantity,
        notes: line.notes?.trim() || undefined,
      });
    }
    workOrder.partLines = validatedParts;
  }

  workOrder.updatedAt = Date.now();
  await writeAutomotiveStoreFile(store);
  return workOrder;
}

export async function deleteWorkOrder(id: string): Promise<boolean> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid work order ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const workOrder = (store.workOrders || []).find((w) => w.id === id);

  if (!workOrder) {
    throw new Error(`Work Order "${id}" not found`);
  }

  workOrder.isDeleted = true;
  workOrder.updatedAt = Date.now();
  await writeAutomotiveStoreFile(store);
  return true;
}

// -----------------------------------------------------------------------------
// Authoritative Estimates Operations (V0.0.8)
// -----------------------------------------------------------------------------

export async function listEstimates(filter?: ListEstimatesFilter): Promise<EstimateRecord[]> {
  const store = await readAutomotiveStoreFile();
  let result = store.estimates || [];

  if (!filter?.includeDeleted) {
    result = result.filter((e) => !e.isDeleted);
  }

  if (filter?.workOrderId) {
    result = result.filter((e) => e.workOrderId === filter.workOrderId);
  }

  if (filter?.vehicleId) {
    result = result.filter((e) => e.vehicleId === filter.vehicleId);
  }

  if (filter?.customerId) {
    result = result.filter((e) => e.customerId === filter.customerId);
  }

  if (filter?.status) {
    result = result.filter((e) => e.status === filter.status);
  }

  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    result = result.filter(
      (e) =>
        e.estimateNumber.toLowerCase().includes(q) ||
        (e.customerNameSnapshot && e.customerNameSnapshot.toLowerCase().includes(q)) ||
        e.vehicleDescriptionSnapshot.toLowerCase().includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q))
    );
  }

  return [...result].sort((a, b) => b.createdAt - a.createdAt);
}

export async function getEstimate(id: string): Promise<EstimateRecord | null> {
  if (!id || typeof id !== 'string') return null;
  const store = await readAutomotiveStoreFile();
  const estimate = (store.estimates || []).find((e) => e.id === id);
  if (!estimate || estimate.isDeleted) return null;
  return estimate;
}

export async function createEstimate(options: CreateEstimateOptions): Promise<EstimateRecord> {
  if (!options || typeof options !== 'object') {
    throw new Error('Invalid options object provided to createEstimate');
  }

  const { workOrderId } = options;
  if (!workOrderId || typeof workOrderId !== 'string') {
    throw new Error('Valid workOrderId is required to create an Estimate');
  }

  const store = await readAutomotiveStoreFile();
  const workOrder = (store.workOrders || []).find((w) => w.id === workOrderId);
  if (!workOrder) {
    throw new Error(`Work Order "${workOrderId}" not found`);
  }
  if (workOrder.isDeleted) {
    throw new Error(`Cannot create Estimate for archived Work Order ${workOrder.workOrderNumber}`);
  }

  // Derive relationship & snapshots authoritatively from Work Order
  const vehicleId = workOrder.vehicleId;
  const customerId = workOrder.customerId || null;
  const vehicleDescriptionSnapshot = workOrder.vehicleDescriptionSnapshot;
  const customerNameSnapshot = workOrder.customerNameSnapshot;
  const workOrderNumberSnapshot = workOrder.workOrderNumber;

  // Build line items
  const validatedLines: EstimateLineItem[] = [];

  if (options.importWorkOrderItems) {
    const defaultLaborRate =
      typeof options.defaultLaborRateCents === 'number' && options.defaultLaborRateCents >= 0
        ? Math.round(options.defaultLaborRateCents)
        : 0;

    // Import labor lines
    for (const labor of workOrder.laborLines) {
      const hours = typeof labor.hours === 'number' && labor.hours >= 0 ? labor.hours : 1;
      const quantityMilli = Math.round(hours * 1000);
      validatedLines.push({
        id: crypto.randomUUID(),
        type: 'labor',
        description: labor.description || 'Labor service',
        quantityMilli,
        unitPriceCents: defaultLaborRate,
        taxable: false,
        sourceWorkOrderLaborLineId: labor.id,
        notes: labor.notes,
      });
    }

    // Import part lines
    for (const part of workOrder.partLines) {
      const quantityMilli = Math.round((part.quantity || 1) * 1000);
      validatedLines.push({
        id: crypto.randomUUID(),
        type: 'part',
        description: part.description || 'Part',
        quantityMilli,
        unitPriceCents: 0,
        taxable: true,
        sourceWorkOrderPartLineId: part.id,
        notes: part.partNumber ? `Part #: ${part.partNumber}` : undefined,
      });
    }
  } else if (Array.isArray(options.lineItems)) {
    for (const item of options.lineItems) {
      const desc = item.description?.trim();
      if (!desc) throw new Error('Line item description cannot be empty');
      if (typeof item.quantityMilli !== 'number' || item.quantityMilli < 0) {
        throw new Error('Line item quantity must be non-negative');
      }
      if (typeof item.unitPriceCents !== 'number' || item.unitPriceCents < 0) {
        throw new Error('Line item unit price cannot be negative');
      }

      validatedLines.push({
        id: crypto.randomUUID(),
        type: item.type || 'labor',
        description: desc,
        quantityMilli: Math.round(item.quantityMilli),
        unitPriceCents: Math.round(item.unitPriceCents),
        taxable: Boolean(item.taxable),
        notes: item.notes?.trim() || undefined,
      });
    }
  }

  // Validate discount & tax
  const taxRateBps =
    typeof options.taxRateBps === 'number' && options.taxRateBps >= 0
      ? Math.round(options.taxRateBps)
      : 0;

  let discountType = options.discountType;
  let fixedDiscountCents =
    typeof options.fixedDiscountCents === 'number' && options.fixedDiscountCents >= 0
      ? Math.round(options.fixedDiscountCents)
      : undefined;
  let discountPercentBps =
    typeof options.discountPercentBps === 'number' && options.discountPercentBps >= 0
      ? Math.round(options.discountPercentBps)
      : undefined;

  if (discountType === 'percent') {
    if (discountPercentBps !== undefined && (discountPercentBps < 0 || discountPercentBps > 10000)) {
      throw new Error('Percentage discount cannot exceed 100% (10000 basis points)');
    }
  }

  // Calculate preliminary totals to validate fixed discount <= subtotal
  const totals = calculateEstimateTotals(
    validatedLines,
    taxRateBps,
    discountType,
    fixedDiscountCents,
    discountPercentBps
  );

  if (discountType === 'fixed' && fixedDiscountCents !== undefined && fixedDiscountCents > totals.subtotalCents) {
    throw new Error(
      `Fixed discount ($${(fixedDiscountCents / 100).toFixed(2)}) cannot exceed subtotal ($${(totals.subtotalCents / 100).toFixed(2)})`
    );
  }

  const seq = store.nextEstimateSequence++;
  const estimateNumber = formatEstimateNumber(seq);
  const now = Date.now();

  const newEstimate: EstimateRecord = {
    id: crypto.randomUUID(),
    estimateNumber,
    workOrderId,
    vehicleId,
    customerId,
    customerNameSnapshot,
    vehicleDescriptionSnapshot,
    workOrderNumberSnapshot,
    status: 'draft',
    lineItems: validatedLines,
    discountType,
    fixedDiscountCents,
    discountPercentBps,
    taxRateBps,
    notes: options.notes?.trim() || undefined,
    customerMessage: options.customerMessage?.trim() || undefined,
    validUntil: typeof options.validUntil === 'number' ? options.validUntil : undefined,
    subtotalCents: totals.subtotalCents,
    discountTotalCents: totals.discountTotalCents,
    taxableSubtotalCents: totals.taxableSubtotalCents,
    taxTotalCents: totals.taxTotalCents,
    totalCents: totals.totalCents,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  if (!store.estimates) store.estimates = [];
  store.estimates.push(newEstimate);
  await writeAutomotiveStoreFile(store);
  return newEstimate;
}

export async function updateEstimate(
  id: string,
  updates: UpdateEstimateOptions
): Promise<EstimateRecord> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid estimate ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const estimate = (store.estimates || []).find((e) => e.id === id);
  if (!estimate || estimate.isDeleted) {
    throw new Error(`Estimate "${id}" not found`);
  }

  // Approved Estimate Mutation Lock: normal updates cannot mutate approved estimates
  if (estimate.status === 'approved') {
    throw new Error(
      `Cannot modify approved Estimate ${estimate.estimateNumber}. Please explicitly reopen the estimate first.`
    );
  }

  // Update line items if provided
  if (Array.isArray(updates.lineItems)) {
    const validatedLines: EstimateLineItem[] = [];
    for (const item of updates.lineItems) {
      const desc = item.description?.trim();
      if (!desc) throw new Error('Line item description cannot be empty');
      if (typeof item.quantityMilli !== 'number' || item.quantityMilli < 0) {
        throw new Error('Line item quantity must be non-negative');
      }
      if (typeof item.unitPriceCents !== 'number' || item.unitPriceCents < 0) {
        throw new Error('Line item unit price cannot be negative');
      }

      validatedLines.push({
        id: item.id || crypto.randomUUID(),
        type: item.type || 'labor',
        description: desc,
        quantityMilli: Math.round(item.quantityMilli),
        unitPriceCents: Math.round(item.unitPriceCents),
        taxable: Boolean(item.taxable),
        sourceWorkOrderLaborLineId: item.sourceWorkOrderLaborLineId,
        sourceWorkOrderPartLineId: item.sourceWorkOrderPartLineId,
        notes: item.notes?.trim() || undefined,
      });
    }
    estimate.lineItems = validatedLines;
  }

  // Update discount & tax fields
  if (updates.discountType !== undefined) {
    estimate.discountType = updates.discountType;
  }
  if (updates.fixedDiscountCents !== undefined) {
    estimate.fixedDiscountCents =
      updates.fixedDiscountCents >= 0 ? Math.round(updates.fixedDiscountCents) : undefined;
  }
  if (updates.discountPercentBps !== undefined) {
    estimate.discountPercentBps =
      updates.discountPercentBps >= 0 ? Math.round(updates.discountPercentBps) : undefined;
  }
  if (updates.taxRateBps !== undefined) {
    estimate.taxRateBps = Math.max(0, Math.round(updates.taxRateBps));
  }

  if (estimate.discountType === 'percent' && estimate.discountPercentBps !== undefined) {
    if (estimate.discountPercentBps < 0 || estimate.discountPercentBps > 10000) {
      throw new Error('Percentage discount cannot exceed 100% (10000 basis points)');
    }
  }

  // Calculate authoritative totals
  const totals = calculateEstimateTotals(
    estimate.lineItems,
    estimate.taxRateBps,
    estimate.discountType,
    estimate.fixedDiscountCents,
    estimate.discountPercentBps
  );

  if (
    estimate.discountType === 'fixed' &&
    estimate.fixedDiscountCents !== undefined &&
    estimate.fixedDiscountCents > totals.subtotalCents
  ) {
    throw new Error(
      `Fixed discount ($${(estimate.fixedDiscountCents / 100).toFixed(2)}) cannot exceed subtotal ($${(totals.subtotalCents / 100).toFixed(2)})`
    );
  }

  estimate.subtotalCents = totals.subtotalCents;
  estimate.discountTotalCents = totals.discountTotalCents;
  estimate.taxableSubtotalCents = totals.taxableSubtotalCents;
  estimate.taxTotalCents = totals.taxTotalCents;
  estimate.totalCents = totals.totalCents;

  if (updates.notes !== undefined) estimate.notes = updates.notes?.trim() || undefined;
  if (updates.customerMessage !== undefined) {
    estimate.customerMessage = updates.customerMessage?.trim() || undefined;
  }
  if (updates.validUntil !== undefined) estimate.validUntil = updates.validUntil;

  // Status transitions and timestamp management
  if (updates.status !== undefined && updates.status !== estimate.status) {
    estimate.status = updates.status;

    if (updates.status === 'approved') {
      estimate.approvedAt = Date.now();
    } else if (updates.status === 'declined') {
      estimate.declinedAt = Date.now();
    }
  }

  estimate.updatedAt = Date.now();
  await writeAutomotiveStoreFile(store);
  return estimate;
}

export async function reopenEstimate(id: string): Promise<EstimateRecord> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid estimate ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const estimate = (store.estimates || []).find((e) => e.id === id);
  if (!estimate || estimate.isDeleted) {
    throw new Error(`Estimate "${id}" not found`);
  }

  // Prevent reopening if an active (non-deleted, non-void) invoice exists
  const activeInvoice = (store.invoices || []).find(
    (inv) => inv.estimateId === id && !inv.isDeleted && inv.status !== 'void'
  );
  if (activeInvoice) {
    throw new Error(
      `Cannot reopen Estimate ${estimate.estimateNumber} while active Invoice ${activeInvoice.invoiceNumber} (${activeInvoice.status}) exists. Please delete draft invoices or void issued invoices before reopening the estimate.`
    );
  }

  estimate.status = 'draft';
  estimate.approvedAt = undefined;
  estimate.updatedAt = Date.now();
  await writeAutomotiveStoreFile(store);
  return estimate;
}

export async function deleteEstimate(id: string): Promise<boolean> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid estimate ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const estimate = (store.estimates || []).find((e) => e.id === id);
  if (!estimate) {
    throw new Error(`Estimate "${id}" not found`);
  }

  // Deletion guard for approved estimates
  if (estimate.status === 'approved') {
    throw new Error(
      `Cannot delete approved Estimate ${estimate.estimateNumber}. Approved commercial proposals must be preserved for historical audit integrity.`
    );
  }

  estimate.isDeleted = true;
  estimate.updatedAt = Date.now();
  await writeAutomotiveStoreFile(store);
  return true;
}

// -----------------------------------------------------------------------------
// Invoices
// -----------------------------------------------------------------------------

export async function listInvoices(filter?: ListInvoicesFilter): Promise<InvoiceRecord[]> {
  const store = await readAutomotiveStoreFile();
  let res = store.invoices || [];

  if (!filter?.includeDeleted) {
    res = res.filter((i) => !i.isDeleted);
  }

  if (filter?.estimateId) {
    res = res.filter((i) => i.estimateId === filter.estimateId);
  }

  if (filter?.workOrderId) {
    res = res.filter((i) => i.workOrderId === filter.workOrderId);
  }

  if (filter?.vehicleId) {
    res = res.filter((i) => i.vehicleId === filter.vehicleId);
  }

  if (filter?.customerId !== undefined) {
    res = res.filter((i) => i.customerId === filter.customerId);
  }

  if (filter?.status) {
    res = res.filter((i) => i.status === filter.status);
  }

  if (filter?.query) {
    const q = filter.query.toLowerCase();
    res = res.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.estimateNumberSnapshot.toLowerCase().includes(q) ||
        i.workOrderNumberSnapshot.toLowerCase().includes(q) ||
        i.vehicleDescriptionSnapshot.toLowerCase().includes(q) ||
        (i.customerNameSnapshot && i.customerNameSnapshot.toLowerCase().includes(q)) ||
        (i.customerMessage && i.customerMessage.toLowerCase().includes(q))
    );
  }

  return res.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getInvoice(id: string): Promise<InvoiceRecord | null> {
  if (!id || typeof id !== 'string') {
    return null;
  }

  const store = await readAutomotiveStoreFile();
  const invoice = (store.invoices || []).find((i) => i.id === id);
  return invoice || null;
}

export async function createInvoice(options: CreateInvoiceOptions): Promise<InvoiceRecord> {
  if (!options || typeof options !== 'object' || !options.estimateId) {
    throw new Error('Valid estimateId is required to create an Invoice');
  }

  const store = await readAutomotiveStoreFile();
  const estimate = (store.estimates || []).find((e) => e.id === options.estimateId);
  if (!estimate || estimate.isDeleted) {
    throw new Error(`Estimate "${options.estimateId}" not found`);
  }

  if (estimate.status !== 'approved') {
    throw new Error(
      `Cannot create Invoice from Estimate ${estimate.estimateNumber}: status is "${estimate.status}". Only approved estimates may be invoiced.`
    );
  }

  // Enforce single active (non-deleted, non-void) invoice per estimate
  const existingActive = (store.invoices || []).find(
    (i) => i.estimateId === estimate.id && !i.isDeleted && i.status !== 'void'
  );
  if (existingActive) {
    throw new Error(
      `An active Invoice (${existingActive.invoiceNumber}, status: ${existingActive.status}) already exists for Estimate ${estimate.estimateNumber}. Only one active invoice is permitted per estimate.`
    );
  }

  const customer = estimate.customerId
    ? (store.customers || []).find((c) => c.id === estimate.customerId)
    : null;

  const customerAddressSnapshot = customer?.address?.trim() || undefined;
  const customerEmailSnapshot = customer?.email?.trim() || undefined;
  const customerPhoneSnapshot = customer?.phone?.trim() || undefined;

  // Deep-copy Estimate line items to new Invoice line items
  const lineItems: InvoiceLineItem[] = (estimate.lineItems || []).map((item) => ({
    id: crypto.randomUUID(),
    type: item.type,
    description: item.description,
    quantityMilli: item.quantityMilli,
    unitPriceCents: item.unitPriceCents,
    taxable: item.taxable,
    sourceEstimateLineItemId: item.id,
    notes: item.notes,
  }));

  const discountType = estimate.discountType;
  const fixedDiscountCents = estimate.fixedDiscountCents;
  const discountPercentBps = estimate.discountPercentBps;
  const taxRateBps = estimate.taxRateBps;

  // Authoritative calculation
  const totals = calculateEstimateTotals(
    lineItems,
    taxRateBps,
    discountType,
    fixedDiscountCents,
    discountPercentBps
  );

  const invoiceNumber = formatInvoiceNumber(store.nextInvoiceSequence++);

  const invoice: InvoiceRecord = {
    id: crypto.randomUUID(),
    invoiceNumber,
    estimateId: estimate.id,
    workOrderId: estimate.workOrderId,
    vehicleId: estimate.vehicleId,
    customerId: estimate.customerId,
    estimateNumberSnapshot: estimate.estimateNumber,
    estimateTotalSnapshotCents: estimate.totalCents,
    workOrderNumberSnapshot: estimate.workOrderNumberSnapshot,
    vehicleDescriptionSnapshot: estimate.vehicleDescriptionSnapshot,
    customerNameSnapshot: estimate.customerNameSnapshot,
    customerAddressSnapshot,
    customerEmailSnapshot,
    customerPhoneSnapshot,
    status: 'draft',
    lineItems,
    discountType,
    fixedDiscountCents,
    discountPercentBps,
    taxRateBps,
    subtotalCents: totals.subtotalCents,
    discountTotalCents: totals.discountTotalCents,
    taxableSubtotalCents: totals.taxableSubtotalCents,
    taxTotalCents: totals.taxTotalCents,
    totalCents: totals.totalCents,
    customerMessage: options.customerMessage?.trim() || estimate.customerMessage,
    internalNotes: options.internalNotes?.trim() || undefined,
    dueDate: options.dueDate?.trim() || undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDeleted: false,
  };

  store.invoices.push(invoice);
  await writeAutomotiveStoreFile(store);
  return invoice;
}

export async function updateInvoice(
  id: string,
  updates: UpdateInvoiceOptions
): Promise<InvoiceRecord> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid invoice ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const invoice = (store.invoices || []).find((i) => i.id === id);
  if (!invoice || invoice.isDeleted) {
    throw new Error(`Invoice "${id}" not found`);
  }

  // Issued and Void invoices are permanently locked against content/financial mutation
  if (invoice.status !== 'draft') {
    throw new Error(
      `Cannot modify ${invoice.status} Invoice ${invoice.invoiceNumber}. Only Draft invoices may be edited.`
    );
  }

  // Update line items if provided
  if (updates.lineItems !== undefined) {
    const validatedLines: InvoiceLineItem[] = [];
    for (const item of updates.lineItems) {
      const desc = item.description?.trim();
      if (!desc) {
        throw new Error('Line item description cannot be empty');
      }
      if (typeof item.quantityMilli !== 'number' || item.quantityMilli < 0) {
        throw new Error('Line item quantity must be a non-negative number');
      }
      if (typeof item.unitPriceCents !== 'number' || item.unitPriceCents < 0) {
        throw new Error('Line item unit price cannot be negative');
      }

      validatedLines.push({
        id: ('id' in item && typeof item.id === 'string' && item.id) ? item.id : crypto.randomUUID(),
        type: item.type || 'labor',
        description: desc,
        quantityMilli: Math.round(item.quantityMilli),
        unitPriceCents: Math.round(item.unitPriceCents),
        taxable: Boolean(item.taxable),
        sourceEstimateLineItemId: item.sourceEstimateLineItemId,
        notes: item.notes?.trim() || undefined,
      });
    }
    invoice.lineItems = validatedLines;
  }

  // Update discount & tax fields
  if (updates.discountType !== undefined) {
    invoice.discountType = updates.discountType;
  }
  if (updates.fixedDiscountCents !== undefined) {
    invoice.fixedDiscountCents =
      updates.fixedDiscountCents >= 0 ? Math.round(updates.fixedDiscountCents) : undefined;
  }
  if (updates.discountPercentBps !== undefined) {
    invoice.discountPercentBps =
      updates.discountPercentBps >= 0 ? Math.round(updates.discountPercentBps) : undefined;
  }
  if (updates.taxRateBps !== undefined) {
    invoice.taxRateBps = Math.max(0, Math.round(updates.taxRateBps));
  }

  if (invoice.discountType === 'percent' && invoice.discountPercentBps !== undefined) {
    if (invoice.discountPercentBps < 0 || invoice.discountPercentBps > 10000) {
      throw new Error('Percentage discount cannot exceed 100% (10000 basis points)');
    }
  }

  // Calculate authoritative totals
  const totals = calculateEstimateTotals(
    invoice.lineItems,
    invoice.taxRateBps,
    invoice.discountType,
    invoice.fixedDiscountCents,
    invoice.discountPercentBps
  );

  if (
    invoice.discountType === 'fixed' &&
    invoice.fixedDiscountCents !== undefined &&
    invoice.fixedDiscountCents > totals.subtotalCents
  ) {
    throw new Error(
      `Fixed discount ($${(invoice.fixedDiscountCents / 100).toFixed(2)}) cannot exceed subtotal ($${(totals.subtotalCents / 100).toFixed(2)})`
    );
  }

  invoice.subtotalCents = totals.subtotalCents;
  invoice.discountTotalCents = totals.discountTotalCents;
  invoice.taxableSubtotalCents = totals.taxableSubtotalCents;
  invoice.taxTotalCents = totals.taxTotalCents;
  invoice.totalCents = totals.totalCents;

  if (updates.customerMessage !== undefined) {
    invoice.customerMessage = updates.customerMessage?.trim() || undefined;
  }
  if (updates.internalNotes !== undefined) {
    invoice.internalNotes = updates.internalNotes?.trim() || undefined;
  }
  if (updates.dueDate !== undefined) {
    invoice.dueDate = updates.dueDate?.trim() || undefined;
  }

  invoice.updatedAt = Date.now();
  await writeAutomotiveStoreFile(store);
  return invoice;
}

export async function issueInvoice(id: string): Promise<InvoiceRecord> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid invoice ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const invoice = (store.invoices || []).find((i) => i.id === id);
  if (!invoice || invoice.isDeleted) {
    throw new Error(`Invoice "${id}" not found`);
  }

  if (invoice.status !== 'draft') {
    throw new Error(
      `Cannot issue Invoice ${invoice.invoiceNumber}: status is already "${invoice.status}".`
    );
  }

  if (invoice.lineItems.length === 0) {
    throw new Error(`Cannot issue Invoice ${invoice.invoiceNumber} with zero line items.`);
  }

  if (invoice.totalCents < 0) {
    throw new Error(`Cannot issue Invoice ${invoice.invoiceNumber} with negative total.`);
  }

  // Integrity Rule: In V0.0.9, an invoice cannot exceed the approved source Estimate total
  if (invoice.totalCents > invoice.estimateTotalSnapshotCents) {
    throw new Error(
      `Cannot issue Invoice ${invoice.invoiceNumber}: total ($${(invoice.totalCents / 100).toFixed(2)}) exceeds approved Estimate ${invoice.estimateNumberSnapshot} total ($${(invoice.estimateTotalSnapshotCents / 100).toFixed(2)}).`
    );
  }

  invoice.status = 'issued';
  invoice.issuedAt = Date.now();
  invoice.updatedAt = Date.now();
  await writeAutomotiveStoreFile(store);
  return invoice;
}

export async function voidInvoice(id: string, reason: string): Promise<InvoiceRecord> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid invoice ID provided');
  }

  const trimmedReason = reason?.trim();
  if (!trimmedReason) {
    throw new Error('A non-empty reason is required to void an Invoice.');
  }

  const store = await readAutomotiveStoreFile();
  const invoice = (store.invoices || []).find((i) => i.id === id);
  if (!invoice || invoice.isDeleted) {
    throw new Error(`Invoice "${id}" not found`);
  }

  // Restrict voidInvoice to issued Invoices only
  if (invoice.status === 'draft') {
    throw new Error(
      `Draft Invoice ${invoice.invoiceNumber} cannot be voided. Please delete the draft instead.`
    );
  }

  if (invoice.status === 'void') {
    throw new Error(`Invoice ${invoice.invoiceNumber} is already voided.`);
  }

  if (invoice.status !== 'issued') {
    throw new Error(
      `Cannot void Invoice ${invoice.invoiceNumber} with status "${invoice.status}". Only issued invoices may be voided.`
    );
  }

  invoice.status = 'void';
  invoice.voidedAt = Date.now();
  invoice.voidReason = trimmedReason;
  invoice.updatedAt = Date.now();
  await writeAutomotiveStoreFile(store);
  return invoice;
}

export async function deleteInvoice(id: string): Promise<boolean> {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid invoice ID provided');
  }

  const store = await readAutomotiveStoreFile();
  const invoice = (store.invoices || []).find((i) => i.id === id);
  if (!invoice) {
    throw new Error(`Invoice "${id}" not found`);
  }

  // Deletion guard for issued and voided invoices
  if (invoice.status === 'issued') {
    throw new Error(
      `Cannot delete issued Invoice ${invoice.invoiceNumber}. Issued commercial financial records must be preserved. Please void the invoice instead.`
    );
  }

  if (invoice.status === 'void') {
    throw new Error(
      `Cannot delete voided Invoice ${invoice.invoiceNumber}. Voided financial records must be preserved for audit integrity.`
    );
  }

  invoice.isDeleted = true;
  invoice.updatedAt = Date.now();
  await writeAutomotiveStoreFile(store);
  return true;
}

