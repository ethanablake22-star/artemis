import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  CustomerRecord,
  VehicleRecord,
  CreateCustomerOptions,
  UpdateCustomerOptions,
  CreateVehicleOptions,
  UpdateVehicleOptions,
} from '@shared/automotiveTypes';
import { automotiveRepository } from '../services/automotiveStorage';

interface AutomotiveContextValue {
  customers: CustomerRecord[];
  vehicles: VehicleRecord[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createCustomer: (options: CreateCustomerOptions) => Promise<CustomerRecord>;
  updateCustomer: (id: string, updates: UpdateCustomerOptions) => Promise<CustomerRecord>;
  deleteCustomer: (id: string) => Promise<boolean>;
  createVehicle: (options: CreateVehicleOptions) => Promise<VehicleRecord>;
  updateVehicle: (id: string, updates: UpdateVehicleOptions) => Promise<VehicleRecord>;
  deleteVehicle: (id: string) => Promise<boolean>;
  getCustomerVehicles: (customerId: string) => VehicleRecord[];
  getCustomerById: (id: string) => CustomerRecord | undefined;
  getVehicleById: (id: string) => VehicleRecord | undefined;
}

const AutomotiveContext = createContext<AutomotiveContextValue | null>(null);

export const AutomotiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedCustomers, fetchedVehicles] = await Promise.all([
        automotiveRepository.listCustomers(),
        automotiveRepository.listVehicles(),
      ]);
      setCustomers(fetchedCustomers);
      setVehicles(fetchedVehicles);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Failed to load automotive data:', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleCreateCustomer = useCallback(
    async (options: CreateCustomerOptions): Promise<CustomerRecord> => {
      setError(null);
      try {
        const created = await automotiveRepository.createCustomer(options);
        setCustomers((prev) => [created, ...prev]);
        return created;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleUpdateCustomer = useCallback(
    async (id: string, updates: UpdateCustomerOptions): Promise<CustomerRecord> => {
      setError(null);
      try {
        const updated = await automotiveRepository.updateCustomer(id, updates);
        setCustomers((prev) => prev.map((c) => (c.id === id ? updated : c)));
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleDeleteCustomer = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const success = await automotiveRepository.deleteCustomer(id);
        if (success) {
          setCustomers((prev) => prev.filter((c) => c.id !== id));
          setVehicles((prev) => prev.filter((v) => v.customerId !== id));
        }
        return success;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleCreateVehicle = useCallback(
    async (options: CreateVehicleOptions): Promise<VehicleRecord> => {
      setError(null);
      try {
        const created = await automotiveRepository.createVehicle(options);
        setVehicles((prev) => [created, ...prev]);
        return created;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleUpdateVehicle = useCallback(
    async (id: string, updates: UpdateVehicleOptions): Promise<VehicleRecord> => {
      setError(null);
      try {
        const updated = await automotiveRepository.updateVehicle(id, updates);
        setVehicles((prev) => prev.map((v) => (v.id === id ? updated : v)));
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleDeleteVehicle = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const success = await automotiveRepository.deleteVehicle(id);
        if (success) {
          setVehicles((prev) => prev.filter((v) => v.id !== id));
        }
        return success;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const getCustomerVehicles = useCallback(
    (customerId: string): VehicleRecord[] => {
      return vehicles.filter((v) => v.customerId === customerId && !v.isDeleted);
    },
    [vehicles]
  );

  const getCustomerById = useCallback(
    (id: string): CustomerRecord | undefined => {
      return customers.find((c) => c.id === id);
    },
    [customers]
  );

  const getVehicleById = useCallback(
    (id: string): VehicleRecord | undefined => {
      return vehicles.find((v) => v.id === id);
    },
    [vehicles]
  );

  const value = useMemo(
    () => ({
      customers,
      vehicles,
      isLoading,
      error,
      refreshData,
      createCustomer: handleCreateCustomer,
      updateCustomer: handleUpdateCustomer,
      deleteCustomer: handleDeleteCustomer,
      createVehicle: handleCreateVehicle,
      updateVehicle: handleUpdateVehicle,
      deleteVehicle: handleDeleteVehicle,
      getCustomerVehicles,
      getCustomerById,
      getVehicleById,
    }),
    [
      customers,
      vehicles,
      isLoading,
      error,
      refreshData,
      handleCreateCustomer,
      handleUpdateCustomer,
      handleDeleteCustomer,
      handleCreateVehicle,
      handleUpdateVehicle,
      handleDeleteVehicle,
      getCustomerVehicles,
      getCustomerById,
      getVehicleById,
    ]
  );

  return <AutomotiveContext.Provider value={value}>{children}</AutomotiveContext.Provider>;
};

export const useAutomotive = (): AutomotiveContextValue => {
  const context = useContext(AutomotiveContext);
  if (!context) {
    throw new Error('useAutomotive must be used within an AutomotiveProvider');
  }
  return context;
};
