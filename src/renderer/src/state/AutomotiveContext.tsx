import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  CustomerRecord,
  VehicleRecord,
  WorkOrderRecord,
  EstimateRecord,
  CreateCustomerOptions,
  UpdateCustomerOptions,
  CreateVehicleOptions,
  UpdateVehicleOptions,
  CreateWorkOrderOptions,
  UpdateWorkOrderOptions,
  CreateEstimateOptions,
  UpdateEstimateOptions,
} from '@shared/automotiveTypes';
import { automotiveRepository } from '../services/automotiveStorage';

interface AutomotiveContextValue {
  customers: CustomerRecord[];
  vehicles: VehicleRecord[];
  workOrders: WorkOrderRecord[];
  estimates: EstimateRecord[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createCustomer: (options: CreateCustomerOptions) => Promise<CustomerRecord>;
  updateCustomer: (id: string, updates: UpdateCustomerOptions) => Promise<CustomerRecord>;
  deleteCustomer: (id: string) => Promise<boolean>;
  createVehicle: (options: CreateVehicleOptions) => Promise<VehicleRecord>;
  updateVehicle: (id: string, updates: UpdateVehicleOptions) => Promise<VehicleRecord>;
  deleteVehicle: (id: string) => Promise<boolean>;
  createWorkOrder: (options: CreateWorkOrderOptions) => Promise<WorkOrderRecord>;
  updateWorkOrder: (id: string, updates: UpdateWorkOrderOptions) => Promise<WorkOrderRecord>;
  deleteWorkOrder: (id: string) => Promise<boolean>;
  createEstimate: (options: CreateEstimateOptions) => Promise<EstimateRecord>;
  updateEstimate: (id: string, updates: UpdateEstimateOptions) => Promise<EstimateRecord>;
  reopenEstimate: (id: string) => Promise<EstimateRecord>;
  deleteEstimate: (id: string) => Promise<boolean>;
  getCustomerVehicles: (customerId: string) => VehicleRecord[];
  getCustomerById: (id: string) => CustomerRecord | undefined;
  getVehicleById: (id: string) => VehicleRecord | undefined;
  getWorkOrderById: (id: string) => WorkOrderRecord | undefined;
  getEstimateById: (id: string) => EstimateRecord | undefined;
  getVehicleWorkOrders: (vehicleId: string) => WorkOrderRecord[];
  getCustomerWorkOrders: (customerId: string) => WorkOrderRecord[];
  getWorkOrderEstimates: (workOrderId: string) => EstimateRecord[];
  getVehicleEstimates: (vehicleId: string) => EstimateRecord[];
  getCustomerEstimates: (customerId: string) => EstimateRecord[];
}

const AutomotiveContext = createContext<AutomotiveContextValue | null>(null);

export const AutomotiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  const [estimates, setEstimates] = useState<EstimateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedCustomers, fetchedVehicles, fetchedWorkOrders, fetchedEstimates] =
        await Promise.all([
          automotiveRepository.listCustomers(),
          automotiveRepository.listVehicles(),
          automotiveRepository.listWorkOrders(),
          automotiveRepository.listEstimates(),
        ]);
      setCustomers(fetchedCustomers);
      setVehicles(fetchedVehicles);
      setWorkOrders(fetchedWorkOrders);
      setEstimates(fetchedEstimates);
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

  const handleCreateWorkOrder = useCallback(
    async (options: CreateWorkOrderOptions): Promise<WorkOrderRecord> => {
      setError(null);
      try {
        const created = await automotiveRepository.createWorkOrder(options);
        setWorkOrders((prev) => [created, ...prev]);
        return created;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleUpdateWorkOrder = useCallback(
    async (id: string, updates: UpdateWorkOrderOptions): Promise<WorkOrderRecord> => {
      setError(null);
      try {
        const updated = await automotiveRepository.updateWorkOrder(id, updates);
        setWorkOrders((prev) => prev.map((w) => (w.id === id ? updated : w)));
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleDeleteWorkOrder = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const success = await automotiveRepository.deleteWorkOrder(id);
        if (success) {
          setWorkOrders((prev) => prev.filter((w) => w.id !== id));
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

  // Estimates Handlers
  const handleCreateEstimate = useCallback(
    async (options: CreateEstimateOptions): Promise<EstimateRecord> => {
      setError(null);
      try {
        const created = await automotiveRepository.createEstimate(options);
        setEstimates((prev) => [created, ...prev]);
        return created;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleUpdateEstimate = useCallback(
    async (id: string, updates: UpdateEstimateOptions): Promise<EstimateRecord> => {
      setError(null);
      try {
        const updated = await automotiveRepository.updateEstimate(id, updates);
        setEstimates((prev) => prev.map((e) => (e.id === id ? updated : e)));
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleReopenEstimate = useCallback(
    async (id: string): Promise<EstimateRecord> => {
      setError(null);
      try {
        const reopened = await automotiveRepository.reopenEstimate(id);
        setEstimates((prev) => prev.map((e) => (e.id === id ? reopened : e)));
        return reopened;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleDeleteEstimate = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const success = await automotiveRepository.deleteEstimate(id);
        if (success) {
          setEstimates((prev) => prev.filter((e) => e.id !== id));
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
      return customers.find((c) => c.id === id && !c.isDeleted);
    },
    [customers]
  );

  const getVehicleById = useCallback(
    (id: string): VehicleRecord | undefined => {
      return vehicles.find((v) => v.id === id && !v.isDeleted);
    },
    [vehicles]
  );

  const getWorkOrderById = useCallback(
    (id: string): WorkOrderRecord | undefined => {
      return workOrders.find((w) => w.id === id && !w.isDeleted);
    },
    [workOrders]
  );

  const getEstimateById = useCallback(
    (id: string): EstimateRecord | undefined => {
      return estimates.find((e) => e.id === id && !e.isDeleted);
    },
    [estimates]
  );

  const getVehicleWorkOrders = useCallback(
    (vehicleId: string): WorkOrderRecord[] => {
      return workOrders.filter((w) => w.vehicleId === vehicleId && !w.isDeleted);
    },
    [workOrders]
  );

  const getCustomerWorkOrders = useCallback(
    (customerId: string): WorkOrderRecord[] => {
      return workOrders.filter((w) => w.customerId === customerId && !w.isDeleted);
    },
    [workOrders]
  );

  const getWorkOrderEstimates = useCallback(
    (workOrderId: string): EstimateRecord[] => {
      return estimates.filter((e) => e.workOrderId === workOrderId && !e.isDeleted);
    },
    [estimates]
  );

  const getVehicleEstimates = useCallback(
    (vehicleId: string): EstimateRecord[] => {
      return estimates.filter((e) => e.vehicleId === vehicleId && !e.isDeleted);
    },
    [estimates]
  );

  const getCustomerEstimates = useCallback(
    (customerId: string): EstimateRecord[] => {
      return estimates.filter((e) => e.customerId === customerId && !e.isDeleted);
    },
    [estimates]
  );

  const value = useMemo(
    () => ({
      customers,
      vehicles,
      workOrders,
      estimates,
      isLoading,
      error,
      refreshData,
      createCustomer: handleCreateCustomer,
      updateCustomer: handleUpdateCustomer,
      deleteCustomer: handleDeleteCustomer,
      createVehicle: handleCreateVehicle,
      updateVehicle: handleUpdateVehicle,
      deleteVehicle: handleDeleteVehicle,
      createWorkOrder: handleCreateWorkOrder,
      updateWorkOrder: handleUpdateWorkOrder,
      deleteWorkOrder: handleDeleteWorkOrder,
      createEstimate: handleCreateEstimate,
      updateEstimate: handleUpdateEstimate,
      reopenEstimate: handleReopenEstimate,
      deleteEstimate: handleDeleteEstimate,
      getCustomerVehicles,
      getCustomerById,
      getVehicleById,
      getWorkOrderById,
      getEstimateById,
      getVehicleWorkOrders,
      getCustomerWorkOrders,
      getWorkOrderEstimates,
      getVehicleEstimates,
      getCustomerEstimates,
    }),
    [
      customers,
      vehicles,
      workOrders,
      estimates,
      isLoading,
      error,
      refreshData,
      handleCreateCustomer,
      handleUpdateCustomer,
      handleDeleteCustomer,
      handleCreateVehicle,
      handleUpdateVehicle,
      handleDeleteVehicle,
      handleCreateWorkOrder,
      handleUpdateWorkOrder,
      handleDeleteWorkOrder,
      handleCreateEstimate,
      handleUpdateEstimate,
      handleReopenEstimate,
      handleDeleteEstimate,
      getCustomerVehicles,
      getCustomerById,
      getVehicleById,
      getWorkOrderById,
      getEstimateById,
      getVehicleWorkOrders,
      getCustomerWorkOrders,
      getWorkOrderEstimates,
      getVehicleEstimates,
      getCustomerEstimates,
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
