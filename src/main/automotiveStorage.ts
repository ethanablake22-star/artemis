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
  ArtemisAutomotiveStoreData,
  CreateCustomerOptions,
  UpdateCustomerOptions,
  CreateVehicleOptions,
  UpdateVehicleOptions,
  CreateWorkOrderOptions,
  UpdateWorkOrderOptions,
  ListCustomersFilter,
  ListVehiclesFilter,
  ListWorkOrdersFilter,
} from '../shared/automotiveTypes';

export const CURRENT_AUTOMOTIVE_SCHEMA_VERSION = 3;
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
      schemaVersion: 3,
      nextCustomerSequence: 1,
      nextVehicleSequence: 1,
      nextWorkOrderSequence: 1,
      customers: [],
      vehicles: [],
      workOrders: [],
    };
  }

  const obj = raw as Record<string, unknown>;
  const version = typeof obj.schemaVersion === 'number' ? obj.schemaVersion : 1;

  switch (version) {
    case 1: {
      // Deterministic migration from Schema 1 -> Schema 3
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
        schemaVersion: 3,
        nextCustomerSequence: migratedCustomers.length + 1,
        nextVehicleSequence: migratedVehicles.length + 1,
        nextWorkOrderSequence: 1,
        customers: migratedCustomers,
        vehicles: migratedVehicles,
        workOrders: [],
      };
    }

    case 2: {
      // Migration from Schema 2 -> Schema 3
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
        schemaVersion: 3,
        nextCustomerSequence,
        nextVehicleSequence,
        nextWorkOrderSequence: 1,
        customers,
        vehicles,
        workOrders: [],
      };
    }

    case 3: {
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
        schemaVersion: 3,
        nextCustomerSequence,
        nextVehicleSequence,
        nextWorkOrderSequence,
        customers,
        vehicles,
        workOrders,
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
      schemaVersion: 3,
      nextCustomerSequence: 1,
      nextVehicleSequence: 1,
      nextWorkOrderSequence: 1,
      customers: [],
      vehicles: [],
      workOrders: [],
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

  const trimmedConcern = customerConcern?.trim();
  if (!trimmedConcern) {
    throw new Error('Customer concern / reason for service is required');
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
  const status = options.status || 'open';
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

  if (updates.customerConcern !== undefined) {
    const trimmed = updates.customerConcern.trim();
    if (!trimmed) throw new Error('Customer concern cannot be empty');
    workOrder.customerConcern = trimmed;
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
