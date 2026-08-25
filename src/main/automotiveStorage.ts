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

export const CURRENT_AUTOMOTIVE_SCHEMA_VERSION = 2;
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
      schemaVersion: 2,
      nextCustomerSequence: 1,
      nextVehicleSequence: 1,
      customers: [],
      vehicles: [],
    };
  }

  const obj = raw as Record<string, unknown>;
  const version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1;

  switch (version) {
    case 1: {
      // Deterministic migration from Schema 1 -> Schema 2
      const rawCustomers = Array.isArray(obj.customers)
        ? (obj.customers as Record<string, unknown>[])
        : [];
      const rawVehicles = Array.isArray(obj.vehicles)
        ? (obj.vehicles as Record<string, unknown>[])
        : [];

      // Sort existing records deterministically: createdAt ascending, id as tie-breaker
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
        schemaVersion: 2,
        nextCustomerSequence: migratedCustomers.length + 1,
        nextVehicleSequence: migratedVehicles.length + 1,
        customers: migratedCustomers,
        vehicles: migratedVehicles,
      };
    }

    case 2: {
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
        schemaVersion: 2,
        nextCustomerSequence,
        nextVehicleSequence,
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
      schemaVersion: 2,
      nextCustomerSequence: 1,
      nextVehicleSequence: 1,
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

  // V0.0.4.1 Invariant: Do NOT delete associated vehicles. Vehicles remain active.
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
