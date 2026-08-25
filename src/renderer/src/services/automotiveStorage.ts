import type {
  CustomerRecord,
  VehicleRecord,
  CreateCustomerOptions,
  UpdateCustomerOptions,
  CreateVehicleOptions,
  UpdateVehicleOptions,
  ListCustomersFilter,
  ListVehiclesFilter,
  IAutomotiveStorageRepository,
} from '@shared/automotiveTypes';

const LOCAL_STORAGE_CUSTOMERS_KEY = 'artemis_automotive_customers_browser_dev';
const LOCAL_STORAGE_VEHICLES_KEY = 'artemis_automotive_vehicles_browser_dev';

function isElectronEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.artemisAPI !== undefined) return true;
  if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('electron')) {
    return true;
  }
  return false;
}

export class LocalAutomotiveRepository implements IAutomotiveStorageRepository {
  private browserDevCustomers: CustomerRecord[] | null = null;
  private browserDevVehicles: VehicleRecord[] | null = null;
  private nextCustomerSeq = 1;
  private nextVehicleSeq = 1;

  async listCustomers(filter?: ListCustomersFilter): Promise<CustomerRecord[]> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.automotive?.listCustomers) {
        throw new Error('Artemis Automotive IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.automotive.listCustomers(filter);
    }
    return this.browserDevListCustomers(filter);
  }

  async getCustomer(id: string): Promise<CustomerRecord | null> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.automotive?.getCustomer) {
        throw new Error('Artemis Automotive IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.automotive.getCustomer(id);
    }
    return this.browserDevGetCustomer(id);
  }

  async createCustomer(options: CreateCustomerOptions): Promise<CustomerRecord> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.automotive?.createCustomer) {
        throw new Error('Artemis Automotive IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.automotive.createCustomer(options);
    }
    return this.browserDevCreateCustomer(options);
  }

  async updateCustomer(id: string, updates: UpdateCustomerOptions): Promise<CustomerRecord> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.automotive?.updateCustomer) {
        throw new Error('Artemis Automotive IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.automotive.updateCustomer(id, updates);
    }
    return this.browserDevUpdateCustomer(id, updates);
  }

  async deleteCustomer(id: string): Promise<boolean> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.automotive?.deleteCustomer) {
        throw new Error('Artemis Automotive IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.automotive.deleteCustomer(id);
    }
    return this.browserDevDeleteCustomer(id);
  }

  async listVehicles(filter?: ListVehiclesFilter): Promise<VehicleRecord[]> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.automotive?.listVehicles) {
        throw new Error('Artemis Automotive IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.automotive.listVehicles(filter);
    }
    return this.browserDevListVehicles(filter);
  }

  async getVehicle(id: string): Promise<VehicleRecord | null> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.automotive?.getVehicle) {
        throw new Error('Artemis Automotive IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.automotive.getVehicle(id);
    }
    return this.browserDevGetVehicle(id);
  }

  async createVehicle(options: CreateVehicleOptions): Promise<VehicleRecord> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.automotive?.createVehicle) {
        throw new Error('Artemis Automotive IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.automotive.createVehicle(options);
    }
    return this.browserDevCreateVehicle(options);
  }

  async updateVehicle(id: string, updates: UpdateVehicleOptions): Promise<VehicleRecord> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.automotive?.updateVehicle) {
        throw new Error('Artemis Automotive IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.automotive.updateVehicle(id, updates);
    }
    return this.browserDevUpdateVehicle(id, updates);
  }

  async deleteVehicle(id: string): Promise<boolean> {
    if (isElectronEnvironment()) {
      if (!window.artemisAPI?.automotive?.deleteVehicle) {
        throw new Error('Artemis Automotive IPC bridge unavailable in Electron environment.');
      }
      return window.artemisAPI.automotive.deleteVehicle(id);
    }
    return this.browserDevDeleteVehicle(id);
  }

  // ---------------------------------------------------------------------------
  // Browser Dev Mode Helpers
  // ---------------------------------------------------------------------------

  private async browserDevLoadCustomers(): Promise<CustomerRecord[]> {
    if (this.browserDevCustomers === null) {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
        this.browserDevCustomers = raw ? JSON.parse(raw) : [];
        this.nextCustomerSeq = (this.browserDevCustomers?.length || 0) + 1;
      } catch {
        this.browserDevCustomers = [];
      }
    }
    return this.browserDevCustomers || [];
  }

  private async browserDevSaveCustomers(items: CustomerRecord[]): Promise<void> {
    this.browserDevCustomers = [...items];
    try {
      localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('LocalStorage save failed for customers:', e);
    }
  }

  private async browserDevLoadVehicles(): Promise<VehicleRecord[]> {
    if (this.browserDevVehicles === null) {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_VEHICLES_KEY);
        this.browserDevVehicles = raw ? JSON.parse(raw) : [];
        this.nextVehicleSeq = (this.browserDevVehicles?.length || 0) + 1;
      } catch {
        this.browserDevVehicles = [];
      }
    }
    return this.browserDevVehicles || [];
  }

  private async browserDevSaveVehicles(items: VehicleRecord[]): Promise<void> {
    this.browserDevVehicles = [...items];
    try {
      localStorage.setItem(LOCAL_STORAGE_VEHICLES_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('LocalStorage save failed for vehicles:', e);
    }
  }

  private async browserDevListCustomers(filter?: ListCustomersFilter): Promise<CustomerRecord[]> {
    const list = await this.browserDevLoadCustomers();
    let res = list;
    if (!filter?.includeDeleted) res = res.filter((c) => !c.isDeleted);
    if (filter?.type) res = res.filter((c) => c.type === filter.type);
    if (filter?.query) {
      const q = filter.query.toLowerCase();
      res = res.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.customerNumber.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q))
      );
    }
    return res.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private async browserDevGetCustomer(id: string): Promise<CustomerRecord | null> {
    const list = await this.browserDevLoadCustomers();
    return list.find((c) => c.id === id) || null;
  }

  private async browserDevCreateCustomer(options: CreateCustomerOptions): Promise<CustomerRecord> {
    const list = await this.browserDevLoadCustomers();
    const type = options.type || 'individual';
    const name =
      type === 'business'
        ? options.businessName?.trim() || options.name?.trim() || 'Unnamed Business'
        : [options.firstName?.trim(), options.lastName?.trim()].filter(Boolean).join(' ') ||
          options.name?.trim() ||
          'Unnamed Customer';

    const now = Date.now();
    const customerNumber = `CUS-${String(this.nextCustomerSeq++).padStart(6, '0')}`;

    const newC: CustomerRecord = {
      id: `cust-${now}-${Math.random().toString(36).substring(2, 6)}`,
      customerNumber,
      type,
      name,
      firstName: options.firstName?.trim(),
      lastName: options.lastName?.trim(),
      businessName: options.businessName?.trim(),
      contactPerson: options.contactPerson?.trim(),
      phone: options.phone?.trim(),
      email: options.email?.trim(),
      address: options.address?.trim(),
      notes: options.notes?.trim(),
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    list.push(newC);
    await this.browserDevSaveCustomers(list);
    return newC;
  }

  private async browserDevUpdateCustomer(id: string, updates: UpdateCustomerOptions): Promise<CustomerRecord> {
    const list = await this.browserDevLoadCustomers();
    const item = list.find((c) => c.id === id);
    if (!item) throw new Error('Customer not found');
    if (updates.type !== undefined) item.type = updates.type;
    if (updates.firstName !== undefined) item.firstName = updates.firstName.trim();
    if (updates.lastName !== undefined) item.lastName = updates.lastName.trim();
    if (updates.businessName !== undefined) item.businessName = updates.businessName.trim();
    if (updates.contactPerson !== undefined) item.contactPerson = updates.contactPerson.trim();

    if (item.type === 'business') {
      item.name = item.businessName || updates.name?.trim() || item.name;
    } else {
      const combined = [item.firstName, item.lastName].filter(Boolean).join(' ');
      item.name = combined || updates.name?.trim() || item.name;
    }

    if (updates.phone !== undefined) item.phone = updates.phone.trim();
    if (updates.email !== undefined) item.email = updates.email.trim();
    if (updates.address !== undefined) item.address = updates.address.trim();
    if (updates.notes !== undefined) item.notes = updates.notes.trim();
    item.updatedAt = Date.now();
    await this.browserDevSaveCustomers(list);
    return item;
  }

  private async browserDevDeleteCustomer(id: string): Promise<boolean> {
    const list = await this.browserDevLoadCustomers();
    const item = list.find((c) => c.id === id);
    if (!item) throw new Error('Customer not found');
    item.isDeleted = true;
    item.updatedAt = Date.now();
    await this.browserDevSaveCustomers(list);
    return true;
  }

  private async browserDevListVehicles(filter?: ListVehiclesFilter): Promise<VehicleRecord[]> {
    const list = await this.browserDevLoadVehicles();
    let res = list;
    if (!filter?.includeDeleted) res = res.filter((v) => !v.isDeleted);
    if (filter?.customerId !== undefined) res = res.filter((v) => v.customerId === filter.customerId);
    if (filter?.query) {
      const q = filter.query.toLowerCase();
      res = res.filter(
        (v) =>
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          v.vehicleNumber.toLowerCase().includes(q) ||
          (v.year && String(v.year).includes(q))
      );
    }
    return res.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  private async browserDevGetVehicle(id: string): Promise<VehicleRecord | null> {
    const list = await this.browserDevLoadVehicles();
    return list.find((v) => v.id === id) || null;
  }

  private async browserDevCreateVehicle(options: CreateVehicleOptions): Promise<VehicleRecord> {
    const list = await this.browserDevLoadVehicles();
    const now = Date.now();
    const vehicleNumber = `VEH-${String(this.nextVehicleSeq++).padStart(6, '0')}`;

    let normalizedVin: string | undefined = undefined;
    if (options.vin && options.vin.trim()) {
      normalizedVin = options.vin.trim().toUpperCase();
      if (list.some((v) => v.vin === normalizedVin)) {
        throw new Error(`A vehicle with VIN "${normalizedVin}" already exists.`);
      }
    }

    const newV: VehicleRecord = {
      id: `veh-${now}-${Math.random().toString(36).substring(2, 6)}`,
      vehicleNumber,
      customerId: options.customerId ?? null,
      year: options.year,
      make: options.make.trim(),
      model: options.model.trim(),
      vin: normalizedVin,
      trim: options.trim?.trim(),
      engine: options.engine?.trim(),
      transmission: options.transmission?.trim(),
      drivetrain: options.drivetrain?.trim(),
      licensePlate: options.licensePlate?.trim().toUpperCase(),
      mileage: options.mileage,
      color: options.color?.trim(),
      notes: options.notes?.trim(),
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    };
    list.push(newV);
    await this.browserDevSaveVehicles(list);
    return newV;
  }

  private async browserDevUpdateVehicle(id: string, updates: UpdateVehicleOptions): Promise<VehicleRecord> {
    const list = await this.browserDevLoadVehicles();
    const item = list.find((v) => v.id === id);
    if (!item) throw new Error('Vehicle not found');
    if (updates.customerId !== undefined) item.customerId = updates.customerId;
    if (updates.year !== undefined) item.year = updates.year;
    if (updates.make !== undefined) item.make = updates.make.trim();
    if (updates.model !== undefined) item.model = updates.model.trim();
    if (updates.vin !== undefined) {
      if (updates.vin && updates.vin.trim()) {
        const norm = updates.vin.trim().toUpperCase();
        if (list.some((v) => v.vin === norm && v.id !== id)) {
          throw new Error(`A vehicle with VIN "${norm}" already exists.`);
        }
        item.vin = norm;
      } else {
        item.vin = undefined;
      }
    }
    if (updates.trim !== undefined) item.trim = updates.trim.trim();
    if (updates.engine !== undefined) item.engine = updates.engine.trim();
    if (updates.transmission !== undefined) item.transmission = updates.transmission.trim();
    if (updates.drivetrain !== undefined) item.drivetrain = updates.drivetrain.trim();
    if (updates.licensePlate !== undefined) item.licensePlate = updates.licensePlate.trim().toUpperCase();
    if (updates.mileage !== undefined) item.mileage = updates.mileage;
    if (updates.color !== undefined) item.color = updates.color.trim();
    if (updates.notes !== undefined) item.notes = updates.notes.trim();
    item.updatedAt = Date.now();
    await this.browserDevSaveVehicles(list);
    return item;
  }

  private async browserDevDeleteVehicle(id: string): Promise<boolean> {
    const list = await this.browserDevLoadVehicles();
    const item = list.find((v) => v.id === id);
    if (!item) throw new Error('Vehicle not found');
    item.isDeleted = true;
    item.updatedAt = Date.now();
    await this.browserDevSaveVehicles(list);
    return true;
  }
}

export const automotiveRepository = new LocalAutomotiveRepository();
