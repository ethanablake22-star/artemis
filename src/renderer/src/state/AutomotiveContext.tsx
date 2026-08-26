import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  CustomerRecord,
  VehicleRecord,
  WorkOrderRecord,
  EstimateRecord,
  InvoiceRecord,
  PaymentRecord,
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
  CreatePaymentOptions,
  InvoicePaymentSummary,
  AccountsReceivableSummary,
  InvoicePaymentStatus,
} from '@shared/automotiveTypes';
import { automotiveRepository } from '../services/automotiveStorage';

interface AutomotiveContextValue {
  customers: CustomerRecord[];
  vehicles: VehicleRecord[];
  workOrders: WorkOrderRecord[];
  estimates: EstimateRecord[];
  invoices: InvoiceRecord[];
  payments: PaymentRecord[];
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
  createInvoice: (options: CreateInvoiceOptions) => Promise<InvoiceRecord>;
  updateInvoice: (id: string, updates: UpdateInvoiceOptions) => Promise<InvoiceRecord>;
  issueInvoice: (id: string) => Promise<InvoiceRecord>;
  voidInvoice: (id: string, reason: string) => Promise<InvoiceRecord>;
  deleteInvoice: (id: string) => Promise<boolean>;
  createPayment: (options: CreatePaymentOptions) => Promise<PaymentRecord>;
  voidPayment: (id: string, reason: string) => Promise<PaymentRecord>;
  getCustomerVehicles: (customerId: string) => VehicleRecord[];
  getCustomerById: (id: string) => CustomerRecord | undefined;
  getVehicleById: (id: string) => VehicleRecord | undefined;
  getWorkOrderById: (id: string) => WorkOrderRecord | undefined;
  getEstimateById: (id: string) => EstimateRecord | undefined;
  getInvoiceById: (id: string) => InvoiceRecord | undefined;
  getPaymentById: (id: string) => PaymentRecord | undefined;
  getVehicleWorkOrders: (vehicleId: string) => WorkOrderRecord[];
  getCustomerWorkOrders: (customerId: string) => WorkOrderRecord[];
  getWorkOrderEstimates: (workOrderId: string) => EstimateRecord[];
  getVehicleEstimates: (vehicleId: string) => EstimateRecord[];
  getCustomerEstimates: (customerId: string) => EstimateRecord[];
  getEstimateInvoices: (estimateId: string) => InvoiceRecord[];
  getWorkOrderInvoices: (workOrderId: string) => InvoiceRecord[];
  getVehicleInvoices: (vehicleId: string) => InvoiceRecord[];
  getCustomerInvoices: (customerId: string) => InvoiceRecord[];
  getInvoicePayments: (invoiceId: string) => PaymentRecord[];
  getCustomerPayments: (customerId: string) => PaymentRecord[];
  getInvoicePaymentSummary: (invoiceId: string) => InvoicePaymentSummary | undefined;
  getAccountsReceivableSummary: () => AccountsReceivableSummary;
}

const AutomotiveContext = createContext<AutomotiveContextValue | null>(null);

export const AutomotiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderRecord[]>([]);
  const [estimates, setEstimates] = useState<EstimateRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        fetchedCustomers,
        fetchedVehicles,
        fetchedWorkOrders,
        fetchedEstimates,
        fetchedInvoices,
        fetchedPayments,
      ] = await Promise.all([
        automotiveRepository.listCustomers(),
        automotiveRepository.listVehicles(),
        automotiveRepository.listWorkOrders(),
        automotiveRepository.listEstimates(),
        automotiveRepository.listInvoices(),
        automotiveRepository.listPayments(),
      ]);
      setCustomers(fetchedCustomers);
      setVehicles(fetchedVehicles);
      setWorkOrders(fetchedWorkOrders);
      setEstimates(fetchedEstimates);
      setInvoices(fetchedInvoices);
      setPayments(fetchedPayments);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('Failed to load automotive data:', err);
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

  // Invoices (V0.0.9)
  const handleCreateInvoice = useCallback(
    async (options: CreateInvoiceOptions): Promise<InvoiceRecord> => {
      setError(null);
      try {
        const created = await automotiveRepository.createInvoice(options);
        setInvoices((prev) => [created, ...prev]);
        return created;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleUpdateInvoice = useCallback(
    async (id: string, updates: UpdateInvoiceOptions): Promise<InvoiceRecord> => {
      setError(null);
      try {
        const updated = await automotiveRepository.updateInvoice(id, updates);
        setInvoices((prev) => prev.map((i) => (i.id === id ? updated : i)));
        return updated;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleIssueInvoice = useCallback(
    async (id: string): Promise<InvoiceRecord> => {
      setError(null);
      try {
        const issued = await automotiveRepository.issueInvoice(id);
        setInvoices((prev) => prev.map((i) => (i.id === id ? issued : i)));
        return issued;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleVoidInvoice = useCallback(
    async (id: string, reason: string): Promise<InvoiceRecord> => {
      setError(null);
      try {
        const voided = await automotiveRepository.voidInvoice(id, reason);
        setInvoices((prev) => prev.map((i) => (i.id === id ? voided : i)));
        return voided;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleDeleteInvoice = useCallback(
    async (id: string): Promise<boolean> => {
      setError(null);
      try {
        const success = await automotiveRepository.deleteInvoice(id);
        if (success) {
          setInvoices((prev) => prev.filter((i) => i.id !== id));
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

  const getInvoiceById = useCallback(
    (id: string): InvoiceRecord | undefined => {
      return invoices.find((i) => i.id === id && !i.isDeleted);
    },
    [invoices]
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

  const getEstimateInvoices = useCallback(
    (estimateId: string): InvoiceRecord[] => {
      return invoices.filter((i) => i.estimateId === estimateId && !i.isDeleted);
    },
    [invoices]
  );

  const handleCreatePayment = useCallback(
    async (options: CreatePaymentOptions): Promise<PaymentRecord> => {
      setError(null);
      try {
        const created = await automotiveRepository.createPayment(options);
        setPayments((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
        return created;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const handleVoidPayment = useCallback(
    async (id: string, reason: string): Promise<PaymentRecord> => {
      setError(null);
      try {
        const voided = await automotiveRepository.voidPayment(id, reason);
        setPayments((prev) => prev.map((p) => (p.id === id ? voided : p)));
        return voided;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        throw err;
      }
    },
    []
  );

  const getWorkOrderInvoices = useCallback(
    (workOrderId: string): InvoiceRecord[] => {
      return invoices.filter((i) => i.workOrderId === workOrderId && !i.isDeleted);
    },
    [invoices]
  );

  const getVehicleInvoices = useCallback(
    (vehicleId: string): InvoiceRecord[] => {
      return invoices.filter((i) => i.vehicleId === vehicleId && !i.isDeleted);
    },
    [invoices]
  );

  const getCustomerInvoices = useCallback(
    (customerId: string): InvoiceRecord[] => {
      return invoices.filter((i) => i.customerId === customerId && !i.isDeleted);
    },
    [invoices]
  );

  const getPaymentById = useCallback(
    (id: string): PaymentRecord | undefined => {
      return payments.find((p) => p.id === id);
    },
    [payments]
  );

  const getInvoicePayments = useCallback(
    (invoiceId: string): PaymentRecord[] => {
      return payments
        .filter((p) => p.invoiceId === invoiceId)
        .sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0) || (b.createdAt || 0) - (a.createdAt || 0));
    },
    [payments]
  );

  const getCustomerPayments = useCallback(
    (customerId: string): PaymentRecord[] => {
      return payments
        .filter((p) => p.customerId === customerId)
        .sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0) || (b.createdAt || 0) - (a.createdAt || 0));
    },
    [payments]
  );

  const getInvoicePaymentSummary = useCallback(
    (invoiceId: string): InvoicePaymentSummary | undefined => {
      const inv = invoices.find((i) => i.id === invoiceId && !i.isDeleted);
      if (!inv) return undefined;
      const invPayments = payments.filter(
        (p) => p.invoiceId === invoiceId && p.status === 'posted'
      );
      const paidCents = invPayments.reduce((sum, p) => sum + p.amountCents, 0);
      const balanceDueCents = Math.max(0, inv.totalCents - paidCents);

      let paymentStatus: InvoicePaymentStatus = 'unpaid';
      if (inv.totalCents === 0 || balanceDueCents === 0) {
        paymentStatus = 'paid';
      } else if (paidCents > 0) {
        paymentStatus = 'partially_paid';
      }

      return {
        invoiceId: inv.id,
        invoiceTotalCents: inv.totalCents,
        paidCents,
        balanceDueCents,
        paymentStatus,
      };
    },
    [invoices, payments]
  );

  const getAccountsReceivableSummary = useCallback((): AccountsReceivableSummary => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const issuedInvoices = invoices.filter((i) => !i.isDeleted && i.status === 'issued');
    let totalReceivableCents = 0;
    let unpaidInvoicesCount = 0;
    let partiallyPaidInvoicesCount = 0;
    let paidInvoicesCount = 0;

    for (const inv of issuedInvoices) {
      const active = payments.filter((p) => p.invoiceId === inv.id && p.status === 'posted');
      const paidCents = active.reduce((sum, p) => sum + p.amountCents, 0);
      const balanceDue = Math.max(0, inv.totalCents - paidCents);
      totalReceivableCents += balanceDue;

      if (inv.totalCents === 0 || balanceDue === 0) {
        paidInvoicesCount++;
      } else if (paidCents === 0) {
        unpaidInvoicesCount++;
      } else {
        partiallyPaidInvoicesCount++;
      }
    }

    const paymentsReceivedTodayCents = payments
      .filter((p) => p.status === 'posted' && p.receivedAt >= startOfToday)
      .reduce((sum, p) => sum + p.amountCents, 0);

    return {
      totalReceivableCents,
      unpaidInvoicesCount,
      partiallyPaidInvoicesCount,
      paidInvoicesCount,
      paymentsReceivedTodayCents,
    };
  }, [invoices, payments]);

  const value = useMemo(
    () => ({
      customers,
      vehicles,
      workOrders,
      estimates,
      invoices,
      payments,
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
      createInvoice: handleCreateInvoice,
      updateInvoice: handleUpdateInvoice,
      issueInvoice: handleIssueInvoice,
      voidInvoice: handleVoidInvoice,
      deleteInvoice: handleDeleteInvoice,
      createPayment: handleCreatePayment,
      voidPayment: handleVoidPayment,
      getCustomerVehicles,
      getCustomerById,
      getVehicleById,
      getWorkOrderById,
      getEstimateById,
      getInvoiceById,
      getPaymentById,
      getVehicleWorkOrders,
      getCustomerWorkOrders,
      getWorkOrderEstimates,
      getVehicleEstimates,
      getCustomerEstimates,
      getEstimateInvoices,
      getWorkOrderInvoices,
      getVehicleInvoices,
      getCustomerInvoices,
      getInvoicePayments,
      getCustomerPayments,
      getInvoicePaymentSummary,
      getAccountsReceivableSummary,
    }),
    [
      customers,
      vehicles,
      workOrders,
      estimates,
      invoices,
      payments,
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
      handleCreateInvoice,
      handleUpdateInvoice,
      handleIssueInvoice,
      handleVoidInvoice,
      handleDeleteInvoice,
      handleCreatePayment,
      handleVoidPayment,
      getCustomerVehicles,
      getCustomerById,
      getVehicleById,
      getWorkOrderById,
      getEstimateById,
      getInvoiceById,
      getPaymentById,
      getVehicleWorkOrders,
      getCustomerWorkOrders,
      getWorkOrderEstimates,
      getVehicleEstimates,
      getCustomerEstimates,
      getEstimateInvoices,
      getWorkOrderInvoices,
      getVehicleInvoices,
      getCustomerInvoices,
      getInvoicePayments,
      getCustomerPayments,
      getInvoicePaymentSummary,
      getAccountsReceivableSummary,
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
