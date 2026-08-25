import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  CustomerRecord,
  VehicleRecord,
  ArtemisAutomotiveStoreData,
  CreateCustomerOptions,
  UpdateCustomerOptions,
  CreateVehicleOptions,
  UpdateVehicleOptions,
  ListCustomersFilter,
  ListVehiclesFilter,
} from '../shared/automotiveTypes';

export const CURRENT_AUTOMOTIVE_SCHEMA_VERSION = 1;
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

function validateAndMigrateAutomotiveStore(raw: unknown): ArtemisAutomotiveStoreData {
  if (!raw || typeof raw !== 'object') {
    return {
      schemaVersion: 1,
      customers: [],
      vehicles: [],
    };
  }

  const obj = raw as Record<string, unknown>;
  const version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1;

  switch (version) {
    case 1: {
      const customers = Array.isArray(obj.customers)
        ? (obj.customers as CustomerRecord[])
        : [];
      const vehicles = Array.isArray(obj.vehicles)
        ? (obj.vehicles as VehicleRecord[])
        : [];
      return {
        schemaVersion: 1,
        customers,
        vehicles,
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
      schemaVersion: 1,
      customers: [],
      vehicles: [],
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

  if (filter?.query && filter.query.trim()) {
    const q = filter.query.toLowerCase().trim();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
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
  const name = options.name?.trim();
  if (!name) {
    throw new Error('Customer name cannot be empty');
  }

  const store = await readAutomotiveStoreFile();
  const now = Date.now();

  const newCustomer: CustomerRecord = {
    id: crypto.randomUUID(),
    name,
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

  if (updates.name !== undefined) {
    const trimmed = updates.name.trim();
    if (!trimmed) {
      throw new Error('Customer name cannot be empty');
    }
    customer.name = trimmed;
  }

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

  // Cascade soft-deletion to customer's vehicles
  for (const v of store.vehicles) {
    if (v.customerId === id) {
      v.isDeleted = true;
      v.updatedAt = now;
    }
  }

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

  if (filter?.customerId) {
    results = results.filter((v) => v.customerId === filter.customerId);
  }

  if (filter?.query && filter.query.trim()) {
    const q = filter.query.toLowerCase().trim();
    results = results.filter(
      (v) =>
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        String(v.year).includes(q) ||
        (v.vin && v.vin.toLowerCase().includes(q)) ||
        (v.licensePlate && v.licensePlate.toLowerCase().includes(q)) ||
        (v.trim && v.trim.toLowerCase().includes(q)) ||
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
  const { customerId, year, make, model } = options;

  if (!customerId || typeof customerId !== 'string') {
    throw new Error('Valid customer ID is required to register a vehicle');
  }

  const store = await readAutomotiveStoreFile();
  const customer = store.customers.find((c) => c.id === customerId);

  if (!customer) {
    throw new Error(`Customer "${customerId}" does not exist`);
  }

  if (customer.isDeleted) {
    throw new Error(`Cannot assign vehicle to deleted customer "${customerId}"`);
  }

  if (!year || typeof year !== 'number' || year < 1900 || year > 2100) {
    throw new Error('Vehicle year must be a valid 4-digit number (e.g. 2006)');
  }

  const trimmedMake = make?.trim();
  const trimmedModel = model?.trim();

  if (!trimmedMake) {
    throw new Error('Vehicle make cannot be empty');
  }

  if (!trimmedModel) {
    throw new Error('Vehicle model cannot be empty');
  }

  const now = Date.now();

  const newVehicle: VehicleRecord = {
    id: crypto.randomUUID(),
    customerId,
    year,
    make: trimmedMake,
    model: trimmedModel,
    vin: options.vin?.trim().toUpperCase() || undefined,
    trim: options.trim?.trim() || undefined,
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
    const customer = store.customers.find((c) => c.id === updates.customerId);
    if (!customer || customer.isDeleted) {
      throw new Error(`Target customer "${updates.customerId}" not found or is deleted`);
    }
    vehicle.customerId = updates.customerId;
  }

  if (updates.year !== undefined) {
    if (typeof updates.year !== 'number' || updates.year < 1900 || updates.year > 2100) {
      throw new Error('Invalid vehicle year');
    }
    vehicle.year = updates.year;
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

  if (updates.vin !== undefined) vehicle.vin = updates.vin.trim().toUpperCase() || undefined;
  if (updates.trim !== undefined) vehicle.trim = updates.trim.trim() || undefined;
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
