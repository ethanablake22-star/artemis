import React, { useState } from 'react';
import {
  Users,
  User,
  Car,
  Search,
  Plus,
  ArrowUpRight,
  Phone,
  Mail,
  Building2,
  ClipboardList,
  Calendar,
  Clock,
  Receipt,
  Calculator,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useSchedule } from '../../../state/ScheduleContext';
import { useTabs } from '../../../state/TabContext';
import { CreateCustomerModal } from './CreateCustomerModal';
import { CreateVehicleModal } from './CreateVehicleModal';
import { CreateWorkOrderModal } from './CreateWorkOrderModal';
import { formatCents } from '@shared/currencyUtils';
import type {
  CustomerRecord,
  VehicleRecord,
  WorkOrderRecord,
  EstimateRecord,
  InvoiceRecord,
  PaymentRecord,
  WorkOrderStatus,
} from '@shared/automotiveTypes';
import clsx from 'clsx';

const STATUS_BADGES: Record<
  WorkOrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  draft: { label: 'Draft', bg: 'bg-zinc-800', text: 'text-zinc-400', border: 'border-zinc-700' },
  open: { label: 'Open', bg: 'bg-silver-500/10', text: 'text-silver-400', border: 'border-silver-500/20' },
  diagnosing: { label: 'Diagnosing', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  awaiting_approval: { label: 'Awaiting Approval', bg: 'bg-bronze-500/10', text: 'text-bronze-400', border: 'border-bronze-500/20' },
  waiting_parts: { label: 'Waiting Parts', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  in_progress: { label: 'In Progress', bg: 'bg-silver-500/10', text: 'text-silver-400', border: 'border-silver-500/20' },
  completed: { label: 'Completed', bg: 'bg-bronze-500/10', text: 'text-bronze-400', border: 'border-bronze-500/20' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

export const AutomotiveHubTab: React.FC = () => {
  const {
    customers,
    vehicles,
    workOrders,
    estimates,
    invoices,
    payments,
    getInvoicePaymentSummary,
    getAccountsReceivableSummary,
    createCustomer,
    createVehicle,
    createWorkOrder,
    getCustomerVehicles,
    getCustomerById,
  } = useAutomotive();

  const {
    openCustomerTab,
    openVehicleTab,
    openWorkOrderTab,
    openEstimateTab,
    openInvoiceTab,
    openPaymentTab,
    openScheduleTab,
    openScheduleEventTab,
  } = useTabs();
  const { todayEvents } = useSchedule();

  const [activeSection, setActiveSection] = useState<
    'workOrders' | 'invoices' | 'payments' | 'estimates' | 'vehicles' | 'customers'
  >('workOrders');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);
  const [isCreateWorkOrderOpen, setIsCreateWorkOrderOpen] = useState(false);

  // AR & Financial Metrics
  const arSummary = getAccountsReceivableSummary();
  const activeWorkOrdersCount = workOrders.filter(
    (w) => w.status !== 'completed' && w.status !== 'cancelled'
  ).length;

  // Search filtering
  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.customerNumber.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.businessName && c.businessName.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  });

  const filteredVehicles = vehicles.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const owner = v.customerId ? getCustomerById(v.customerId) : null;
    return (
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.vehicleNumber.toLowerCase().includes(q) ||
      (v.year && String(v.year).includes(q)) ||
      (v.vin && v.vin.toLowerCase().includes(q)) ||
      (v.licensePlate && v.licensePlate.toLowerCase().includes(q)) ||
      (v.engine && v.engine.toLowerCase().includes(q)) ||
      (owner && owner.name.toLowerCase().includes(q))
    );
  });

  const filteredWorkOrders = workOrders.filter((w) => {
    if (statusFilter !== 'all' && w.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      w.workOrderNumber.toLowerCase().includes(q) ||
      w.customerConcern.toLowerCase().includes(q) ||
      (w.customerNameSnapshot && w.customerNameSnapshot.toLowerCase().includes(q)) ||
      w.vehicleDescriptionSnapshot.toLowerCase().includes(q) ||
      (w.vinSnapshot && w.vinSnapshot.toLowerCase().includes(q)) ||
      (w.workPerformed && w.workPerformed.toLowerCase().includes(q))
    );
  });

  const filteredEstimates = estimates.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      e.estimateNumber.toLowerCase().includes(q) ||
      e.workOrderNumberSnapshot.toLowerCase().includes(q) ||
      e.vehicleDescriptionSnapshot.toLowerCase().includes(q) ||
      (e.customerNameSnapshot && e.customerNameSnapshot.toLowerCase().includes(q)) ||
      (e.customerMessage && e.customerMessage.toLowerCase().includes(q))
    );
  });

  const filteredInvoices = invoices.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      i.invoiceNumber.toLowerCase().includes(q) ||
      i.estimateNumberSnapshot.toLowerCase().includes(q) ||
      i.workOrderNumberSnapshot.toLowerCase().includes(q) ||
      i.vehicleDescriptionSnapshot.toLowerCase().includes(q) ||
      (i.customerNameSnapshot && i.customerNameSnapshot.toLowerCase().includes(q)) ||
      (i.customerMessage && i.customerMessage.toLowerCase().includes(q)) ||
      (i.dueDate && i.dueDate.includes(q))
    );
  });

  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (paymentMethodFilter !== 'all' && p.method !== paymentMethodFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.paymentNumber.toLowerCase().includes(q) ||
      p.invoiceNumberSnapshot.toLowerCase().includes(q) ||
      (p.customerNameSnapshot && p.customerNameSnapshot.toLowerCase().includes(q)) ||
      p.vehicleDescriptionSnapshot.toLowerCase().includes(q) ||
      (p.reference && p.reference.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleOpenCustomer = (c: CustomerRecord) => {
    openCustomerTab(c.id, c.name);
  };

  const handleOpenVehicle = (v: VehicleRecord) => {
    const title = `${v.year ? `${v.year} ` : ''}${v.make} ${v.model}`;
    openVehicleTab(v.id, title);
  };

  const handleOpenWorkOrder = (w: WorkOrderRecord) => {
    openWorkOrderTab(w.id, `${w.workOrderNumber} — ${w.vehicleDescriptionSnapshot}`);
  };

  const handleOpenEstimate = (e: EstimateRecord) => {
    openEstimateTab(e.id, `${e.estimateNumber} — ${e.vehicleDescriptionSnapshot}`);
  };

  const handleOpenInvoice = (i: InvoiceRecord) => {
    openInvoiceTab(
      i.id,
      `${i.invoiceNumber} — ${i.customerNameSnapshot || i.vehicleDescriptionSnapshot}`
    );
  };

  const handleOpenPayment = (p: PaymentRecord) => {
    openPaymentTab(
      p.id,
      `${p.paymentNumber} — ${p.invoiceNumberSnapshot}`
    );
  };

  return (
    <div className="h-full w-full bg-artemis-950 flex flex-col overflow-hidden text-zinc-100 select-none">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Header Title Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-bronze-500/10 text-bronze-400 border border-bronze-500/20 font-bold">
                Automotive Suite
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                V0.0.10 Payments & Balances
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight mt-1">
              Shop Operations & Commercial Hub
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateCustomerOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-artemis-900 hover:bg-artemis-800 border border-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-silver-400" />
              New Customer
            </button>
            <button
              type="button"
              onClick={() => setIsCreateVehicleOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-artemis-900 hover:bg-artemis-800 border border-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-silver-400" />
              New Vehicle
            </button>
            <button
              type="button"
              onClick={() => setIsCreateWorkOrderOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-bronze-500 hover:bg-bronze-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-bronze-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              Open Work Order
            </button>
          </div>
        </div>

        {/* METRICS ROW (Operations & Accounts Receivable) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            onClick={() => {
              setActiveSection('invoices');
              setStatusFilter('issued');
            }}
            className="p-4 rounded-xl bg-artemis-900/90 border border-zinc-800 flex items-center justify-between cursor-pointer hover:border-bronze-500/40 transition-colors"
          >
            <div>
              <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold block">
                Accounts Receivable
              </span>
              <span className={`text-2xl font-bold mt-0.5 block font-mono ${arSummary.totalReceivableCents > 0 ? 'text-bronze-400' : 'text-zinc-100'}`}>
                {formatCents(arSummary.totalReceivableCents)}
              </span>
              <span className="text-[11px] text-zinc-500 block mt-0.5">
                {arSummary.unpaidInvoicesCount} unpaid · {arSummary.partiallyPaidInvoicesCount} partial
              </span>
            </div>
            <div className="p-3 rounded-xl bg-bronze-500/10 text-bronze-400 border border-bronze-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => {
              setActiveSection('payments');
              setStatusFilter('posted');
            }}
            className="p-4 rounded-xl bg-artemis-900/90 border border-zinc-800 flex items-center justify-between cursor-pointer hover:border-bronze-500/40 transition-colors"
          >
            <div>
              <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold block">
                Received Today
              </span>
              <span className="text-2xl font-bold text-bronze-400 mt-0.5 block font-mono">
                {formatCents(arSummary.paymentsReceivedTodayCents)}
              </span>
              <span className="text-[11px] text-zinc-500 block mt-0.5">
                {payments.filter((p) => p.status === 'posted').length} total payments
              </span>
            </div>
            <div className="p-3 rounded-xl bg-bronze-500/10 text-bronze-400 border border-bronze-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => {
              setActiveSection('workOrders');
              setStatusFilter('all');
            }}
            className="p-4 rounded-xl bg-artemis-900/90 border border-zinc-800 flex items-center justify-between cursor-pointer hover:border-bronze-500/40 transition-colors"
          >
            <div>
              <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold block">
                Active Repairs
              </span>
              <span className="text-2xl font-bold text-silver-400 mt-0.5 block font-mono">
                {activeWorkOrdersCount}
              </span>
              <span className="text-[11px] text-zinc-500 block mt-0.5">
                {workOrders.length} total work orders
              </span>
            </div>
            <div className="p-3 rounded-xl bg-silver-500/10 text-silver-400 border border-silver-500/20">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setActiveSection('customers')}
            className="p-4 rounded-xl bg-artemis-900/90 border border-zinc-800 flex items-center justify-between cursor-pointer hover:border-silver-500/40 transition-colors"
          >
            <div>
              <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold block">
                Customer Accounts
              </span>
              <span className="text-2xl font-bold text-zinc-100 mt-0.5 block font-mono">
                {customers.length}
              </span>
              <span className="text-[11px] text-zinc-500 block mt-0.5">
                {vehicles.length} tracked vehicles
              </span>
            </div>
            <div className="p-3 rounded-xl bg-silver-500/10 text-silver-400 border border-silver-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* TODAY'S SCHEDULE BANNER */}
        <div className="p-4 rounded-xl bg-artemis-900/90 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5 font-mono">
              <Calendar className="w-4 h-4 text-rose-400" />
              Today's Schedule & Service Dispatch ({todayEvents.length})
            </h3>
            <button
              type="button"
              onClick={() => openScheduleTab()}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 transition-colors"
            >
              Open Full Schedule →
            </button>
          </div>

          {todayEvents.length === 0 ? (
            <div className="text-xs text-zinc-500 italic p-2 bg-artemis-950/40 rounded-lg">
              No appointments scheduled for today.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {todayEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => openScheduleEventTab(ev.id, `${ev.eventNumber} — ${ev.title}`)}
                  className="p-3 rounded-lg bg-artemis-950 border border-zinc-800/80 hover:border-rose-500/40 cursor-pointer group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-rose-400">
                      {ev.eventNumber}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-zinc-400 border border-zinc-700 px-1 py-0.2 rounded">
                      {ev.status}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-zinc-200 group-hover:text-rose-300 transition-colors mt-0.5 truncate">
                    {ev.title}
                  </h5>
                  <div className="text-[11px] text-zinc-400 mt-1 font-mono flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span>
                      {ev.allDay
                        ? 'All Day'
                        : `${new Date(ev.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${new Date(ev.endAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Directory Navigation & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Section Toggle */}
          <div className="flex items-center p-1 bg-artemis-900 rounded-xl border border-zinc-800 w-fit flex-wrap gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveSection('workOrders');
                setStatusFilter('all');
              }}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                activeSection === 'workOrders'
                  ? 'bg-bronze-500/20 text-bronze-400 border border-bronze-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Work Orders ({workOrders.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection('invoices');
                setStatusFilter('all');
              }}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                activeSection === 'invoices'
                  ? 'bg-bronze-500/20 text-bronze-400 border border-bronze-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Receipt className="w-3.5 h-3.5" />
              Invoices ({invoices.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection('payments');
                setStatusFilter('all');
                setPaymentMethodFilter('all');
              }}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                activeSection === 'payments'
                  ? 'bg-bronze-500/20 text-bronze-400 border border-bronze-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <CreditCard className="w-3.5 h-3.5" />
              Payments ({payments.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection('estimates');
                setStatusFilter('all');
              }}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                activeSection === 'estimates'
                  ? 'bg-bronze-500/20 text-bronze-400 border border-bronze-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Calculator className="w-3.5 h-3.5" />
              Estimates ({estimates.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection('vehicles');
                setStatusFilter('all');
              }}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                activeSection === 'vehicles'
                  ? 'bg-silver-500/20 text-silver-400 border border-silver-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Car className="w-3.5 h-3.5" />
              Vehicles ({vehicles.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection('customers');
                setStatusFilter('all');
              }}
              className={clsx(
                'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5',
                activeSection === 'customers'
                  ? 'bg-silver-500/20 text-silver-400 border border-silver-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              Customers ({customers.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -tranzinc-y-1/2" />
            <input
              type="text"
              placeholder={
                activeSection === 'workOrders'
                  ? 'Search by WO-#, vehicle, concern...'
                  : activeSection === 'invoices'
                  ? 'Search by INV-#, customer, vehicle...'
                  : activeSection === 'payments'
                  ? 'Search by PAY-#, INV-#, customer, ref...'
                  : activeSection === 'estimates'
                  ? 'Search by EST-#, customer, vehicle...'
                  : activeSection === 'customers'
                  ? 'Search by name, CUS-#, phone...'
                  : 'Search by make, model, VEH-#, VIN...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-artemis-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-bronze-500/60"
            />
          </div>
        </div>

        {/* Section 1: Work Orders Directory */}
        {activeSection === 'workOrders' && (
          <div className="space-y-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { key: 'all', label: 'All Orders' },
                { key: 'open', label: 'Open' },
                { key: 'diagnosing', label: 'Diagnosing' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'waiting_parts', label: 'Waiting Parts' },
                { key: 'completed', label: 'Completed' },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setStatusFilter(pill.key)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                    statusFilter === pill.key
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {filteredWorkOrders.length === 0 ? (
              <div className="p-12 rounded-2xl border border-zinc-800 bg-artemis-900/40 text-center flex flex-col items-center justify-center">
                <ClipboardList className="w-10 h-10 text-zinc-600 mb-2" />
                <h3 className="text-sm font-bold text-zinc-300">No Work Orders Found</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No work order records match the active filter.'
                    : 'Open your first automotive work order to start recording service history.'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <button
                    type="button"
                    onClick={() => setIsCreateWorkOrderOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-bronze-500 text-zinc-950 text-xs font-bold flex items-center gap-1.5 hover:bg-bronze-400"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Open Work Order
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-artemis-900/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-artemis-950/80 text-zinc-400 font-medium">
                      <th className="py-3 px-4">Work Order #</th>
                      <th className="py-3 px-4">Target Vehicle</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Concern / Description</th>
                      <th className="py-3 px-4">Opened</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkOrders.map((wo) => {
                      const badge = STATUS_BADGES[wo.status] || STATUS_BADGES.open;
                      return (
                        <tr
                          key={wo.id}
                          onDoubleClick={() => handleOpenWorkOrder(wo)}
                          className="border-b border-zinc-800/60 hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-bronze-400 group-hover:underline">
                                {wo.workOrderNumber}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-zinc-200 block">
                              {wo.vehicleDescriptionSnapshot}
                            </span>
                            {wo.vinSnapshot && (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                VIN: {wo.vinSnapshot}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-300">
                            {wo.customerNameSnapshot ? (
                              <span className="font-semibold text-zinc-200">
                                {wo.customerNameSnapshot}
                              </span>
                            ) : (
                              <span className="text-zinc-500 italic text-[11px]">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={clsx(
                                'text-[10px] font-bold px-2 py-0.5 rounded border font-mono',
                                badge.bg,
                                badge.text,
                                badge.border
                              )}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-300 max-w-xs truncate">
                            {wo.customerConcern}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                            {formatDate(wo.openedAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWorkOrder(wo);
                              }}
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              Open Tab
                              <ArrowUpRight className="w-3 h-3 text-bronze-400" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section 2: Invoices Directory (V0.0.9) */}
        {activeSection === 'invoices' && (
          <div className="space-y-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { key: 'all', label: 'All Invoices' },
                { key: 'draft', label: 'Draft' },
                { key: 'issued', label: 'Issued' },
                { key: 'void', label: 'Void' },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setStatusFilter(pill.key)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                    statusFilter === pill.key
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="p-12 rounded-2xl border border-zinc-800 bg-artemis-900/40 text-center flex flex-col items-center justify-center">
                <Receipt className="w-10 h-10 text-zinc-600 mb-2" />
                <h3 className="text-sm font-bold text-zinc-300">No Invoices Found</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No invoice records match the active filter.'
                    : 'Invoices are generated from approved customer estimates.'}
                </p>
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-artemis-900/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-artemis-950/80 text-zinc-400 font-medium">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Total Due</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Created / Issued</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => {
                      const summary = getInvoicePaymentSummary(inv.id);
                      return (
                        <tr
                          key={inv.id}
                          onDoubleClick={() => handleOpenInvoice(inv)}
                          className="border-b border-zinc-800/60 hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-bold text-bronze-400 group-hover:underline">
                              {inv.invoiceNumber}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-200 font-semibold">
                            {inv.customerNameSnapshot || 'Valued Customer'}
                          </td>
                          <td className="py-3 px-4 text-zinc-300">
                            {inv.vehicleDescriptionSnapshot}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1.5">
                              <span
                                className={clsx(
                                  'text-[10px] font-bold px-2 py-0.5 rounded border uppercase',
                                  inv.status === 'issued'
                                    ? 'bg-bronze-950/60 text-bronze-400 border-bronze-800/80'
                                    : inv.status === 'void'
                                      ? 'bg-rose-950/60 text-rose-400 border-rose-800/80'
                                      : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                                )}
                              >
                                {inv.status}
                              </span>
                              {inv.status === 'issued' && summary && (
                                <span
                                  className={clsx(
                                    'text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase',
                                    summary.paymentStatus === 'paid'
                                      ? 'bg-bronze-950/60 text-bronze-300 border-bronze-800/80'
                                      : summary.paymentStatus === 'partially_paid'
                                      ? 'bg-silver-950/60 text-silver-300 border-silver-800/80'
                                      : 'bg-bronze-950/60 text-bronze-300 border-bronze-800/80'
                                  )}
                                >
                                  {summary.paymentStatus === 'paid'
                                    ? 'Paid'
                                    : summary.paymentStatus === 'partially_paid'
                                    ? 'Partial'
                                    : 'Unpaid'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="font-mono font-bold text-white text-sm">
                              {formatCents(inv.totalCents)}
                            </div>
                            {inv.status === 'issued' && summary && summary.balanceDueCents > 0 && (
                              <div className="text-[10px] text-bronze-400 font-mono font-semibold">
                                Bal: {formatCents(summary.balanceDueCents)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                            {inv.dueDate || 'Upon receipt'}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                            {inv.issuedAt ? formatDate(inv.issuedAt) : formatDate(inv.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenInvoice(inv);
                              }}
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              Open Tab
                              <ArrowUpRight className="w-3 h-3 text-bronze-400" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section 3: Payments Directory (V0.0.10) */}
        {activeSection === 'payments' && (
          <div className="space-y-3">
            {/* Status & Method Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { key: 'all', label: 'All Payments' },
                  { key: 'posted', label: 'Posted' },
                  { key: 'void', label: 'Void' },
                ].map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => setStatusFilter(pill.key)}
                    className={clsx(
                      'px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                      statusFilter === pill.key
                        ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                        : 'text-zinc-500 hover:text-zinc-300'
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-zinc-400 text-xs font-medium">Method:</span>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="bg-artemis-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-bronze-500"
                >
                  <option value="all">All Methods</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="digital_wallet">Digital Wallet</option>
                  <option value="financing">Financing</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="p-12 rounded-2xl border border-zinc-800 bg-artemis-900/40 text-center flex flex-col items-center justify-center">
                <CreditCard className="w-10 h-10 text-zinc-600 mb-2" />
                <h3 className="text-sm font-bold text-zinc-300">No Payments Found</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  {searchQuery || statusFilter !== 'all' || paymentMethodFilter !== 'all'
                    ? 'No payment records match the active filter.'
                    : 'Payments are recorded against issued invoices.'}
                </p>
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-artemis-900/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-artemis-950/80 text-zinc-400 font-medium">
                      <th className="py-3 px-4">Payment #</th>
                      <th className="py-3 px-4">Applied Invoice</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Received Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => {
                      const isPayVoid = p.status === 'void';
                      return (
                        <tr
                          key={p.id}
                          onDoubleClick={() => handleOpenPayment(p)}
                          className="border-b border-zinc-800/60 hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-bold text-bronze-400 group-hover:underline">
                              {p.paymentNumber}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openInvoiceTab(p.invoiceId, `${p.invoiceNumberSnapshot} — ${p.customerNameSnapshot || 'Invoice'}`);
                              }}
                              className="font-mono text-xs text-bronze-400 hover:text-bronze-300 hover:underline flex items-center space-x-1"
                            >
                              <span>{p.invoiceNumberSnapshot}</span>
                              <ArrowUpRight className="w-3 h-3 opacity-70" />
                            </button>
                          </td>
                          <td className="py-3 px-4 text-zinc-200 font-semibold">
                            {p.customerNameSnapshot || 'Direct / Walk-in'}
                          </td>
                          <td className="py-3 px-4 text-zinc-300">
                            {p.vehicleDescriptionSnapshot}
                          </td>
                          <td className="py-3 px-4 text-zinc-300 capitalize">
                            {p.method.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-4 text-zinc-400 font-mono">
                            {p.reference || '—'}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${isPayVoid ? 'text-rose-400 line-through' : 'text-bronze-400'}`}>
                            {formatCents(p.amountCents)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={clsx(
                                'text-[10px] font-bold px-2 py-0.5 rounded border uppercase',
                                isPayVoid
                                  ? 'bg-rose-950/60 text-rose-400 border-rose-800/80'
                                  : 'bg-bronze-950/60 text-bronze-400 border-bronze-800/80'
                              )}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                            {formatDate(p.receivedAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPayment(p);
                              }}
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              Receipt
                              <ArrowUpRight className="w-3 h-3 text-bronze-400" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section 3: Estimates Directory (V0.0.8) */}
        {activeSection === 'estimates' && (
          <div className="space-y-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { key: 'all', label: 'All Estimates' },
                { key: 'draft', label: 'Draft' },
                { key: 'ready', label: 'Ready' },
                { key: 'approved', label: 'Approved' },
                { key: 'declined', label: 'Declined' },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setStatusFilter(pill.key)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                    statusFilter === pill.key
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {filteredEstimates.length === 0 ? (
              <div className="p-12 rounded-2xl border border-zinc-800 bg-artemis-900/40 text-center flex flex-col items-center justify-center">
                <Calculator className="w-10 h-10 text-zinc-600 mb-2" />
                <h3 className="text-sm font-bold text-zinc-300">No Estimates Found</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No estimate records match the active filter.'
                    : 'Generate estimates from Work Orders to propose commercial repair terms.'}
                </p>
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-artemis-900/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-artemis-950/80 text-zinc-400 font-medium">
                      <th className="py-3 px-4">Estimate #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Proposal Total</th>
                      <th className="py-3 px-4">Work Order</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEstimates.map((est) => (
                      <tr
                        key={est.id}
                        onDoubleClick={() => handleOpenEstimate(est)}
                        className="border-b border-zinc-800/60 hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-bold text-bronze-400 group-hover:underline">
                            {est.estimateNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-200 font-semibold">
                          {est.customerNameSnapshot || 'Valued Customer'}
                        </td>
                        <td className="py-3 px-4 text-zinc-300">
                          {est.vehicleDescriptionSnapshot}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={clsx(
                              'text-[10px] font-bold px-2 py-0.5 rounded border uppercase',
                              est.status === 'approved'
                                ? 'bg-bronze-950/60 text-bronze-400 border-bronze-800/80'
                                : est.status === 'declined'
                                  ? 'bg-rose-950/60 text-rose-400 border-rose-800/80'
                                  : est.status === 'ready'
                                    ? 'bg-silver-950/60 text-silver-400 border-silver-800/80'
                                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                            )}
                          >
                            {est.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-white text-sm">
                          {formatCents(est.totalCents)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                          {est.workOrderNumberSnapshot}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                          {formatDate(est.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEstimate(est);
                            }}
                            className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            Open Tab
                            <ArrowUpRight className="w-3 h-3 text-bronze-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Customers Table */}
        {activeSection === 'customers' && (
          <div className="space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="p-12 rounded-2xl border border-zinc-800 bg-artemis-900/40 text-center flex flex-col items-center justify-center">
                <Users className="w-10 h-10 text-zinc-600 mb-2" />
                <h3 className="text-sm font-bold text-zinc-300">No Customers Found</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  {searchQuery
                    ? 'No customer records match your search filter.'
                    : 'Get started by registering your first customer profile.'}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => setIsCreateCustomerOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-silver-500 text-zinc-950 text-xs font-bold flex items-center gap-1.5 hover:bg-silver-400"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Customer
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-artemis-900/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-artemis-950/80 text-zinc-400 font-medium">
                      <th className="py-3 px-4">Account / Number</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Fleet</th>
                      <th className="py-3 px-4">Added</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer) => {
                      const fleet = getCustomerVehicles(customer.id);
                      return (
                        <tr
                          key={customer.id}
                          onDoubleClick={() => handleOpenCustomer(customer)}
                          className="border-b border-zinc-800/60 hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-silver-500/10 border border-silver-500/20 text-silver-400 flex items-center justify-center font-bold text-xs shrink-0">
                                {customer.type === 'business' ? (
                                  <Building2 className="w-4 h-4" />
                                ) : (
                                  <User className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-bold text-silver-400">
                                    {customer.customerNumber}
                                  </span>
                                </div>
                                <span className="font-bold text-zinc-200 group-hover:text-silver-300 transition-colors block">
                                  {customer.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {customer.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-zinc-300">
                            <div className="space-y-0.5">
                              {customer.phone && (
                                <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                                  <Phone className="w-3 h-3 text-zinc-500" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                              {customer.email && (
                                <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                                  <Mail className="w-3 h-3 text-zinc-500" />
                                  <span>{customer.email}</span>
                                </div>
                              )}
                              {!customer.phone && !customer.email && (
                                <span className="text-zinc-600 italic text-[11px]">No contact details</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-bold text-zinc-300">
                              {fleet.length} {fleet.length === 1 ? 'vehicle' : 'vehicles'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                            {formatDate(customer.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCustomer(customer);
                              }}
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              Open Tab
                              <ArrowUpRight className="w-3 h-3 text-silver-400" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section 5: Vehicles Table */}
        {activeSection === 'vehicles' && (
          <div className="space-y-3">
            {filteredVehicles.length === 0 ? (
              <div className="p-12 rounded-2xl border border-zinc-800 bg-artemis-900/40 text-center flex flex-col items-center justify-center">
                <Car className="w-10 h-10 text-zinc-600 mb-2" />
                <h3 className="text-sm font-bold text-zinc-300">No Vehicles Found</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  {searchQuery
                    ? 'No vehicle records match your search filter.'
                    : 'Register your first customer vehicle to begin logging service records.'}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => setIsCreateVehicleOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-silver-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-silver-500"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Register Vehicle
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-artemis-900/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-artemis-950/80 text-zinc-400 font-medium">
                      <th className="py-3 px-4">Vehicle #</th>
                      <th className="py-3 px-4">Year / Make / Model</th>
                      <th className="py-3 px-4">Owner</th>
                      <th className="py-3 px-4">Plate / VIN</th>
                      <th className="py-3 px-4">Odometer</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.map((vehicle) => {
                      const owner = vehicle.customerId ? getCustomerById(vehicle.customerId) : null;
                      return (
                        <tr
                          key={vehicle.id}
                          onDoubleClick={() => handleOpenVehicle(vehicle)}
                          className="border-b border-zinc-800/60 hover:bg-zinc-800/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <span className="font-mono text-[10px] font-bold text-silver-400">
                              {vehicle.vehicleNumber}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-zinc-200 group-hover:text-silver-300 transition-colors block">
                              {vehicle.year ? `${vehicle.year} ` : ''}
                              {vehicle.make} {vehicle.model}
                            </span>
                            {vehicle.trim && (
                              <span className="text-[10px] text-zinc-400">{vehicle.trim}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-300">
                            {owner ? (
                              <span className="font-semibold text-zinc-200">{owner.name}</span>
                            ) : (
                              <span className="text-zinc-500 italic text-[11px]">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-zinc-300">
                            <div>{vehicle.licensePlate || 'No Plate'}</div>
                            {vehicle.vin && (
                              <div className="text-[10px] text-zinc-500 truncate max-w-[140px]">
                                {vehicle.vin}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-zinc-300">
                            {vehicle.mileage !== undefined
                              ? `${vehicle.mileage.toLocaleString()} mi`
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenVehicle(vehicle);
                              }}
                              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              Open Tab
                              <ArrowUpRight className="w-3 h-3 text-silver-400" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateCustomerModal
        isOpen={isCreateCustomerOpen}
        onClose={() => setIsCreateCustomerOpen(false)}
        onSubmit={async (opts) => {
          const created = await createCustomer(opts);
          openCustomerTab(created.id, created.name);
        }}
      />

      <CreateVehicleModal
        isOpen={isCreateVehicleOpen}
        customers={customers}
        onClose={() => setIsCreateVehicleOpen(false)}
        onSubmit={async (opts) => {
          const created = await createVehicle(opts);
          const title = `${created.year ? `${created.year} ` : ''}${created.make} ${created.model}`;
          openVehicleTab(created.id, title);
        }}
      />

      <CreateWorkOrderModal
        isOpen={isCreateWorkOrderOpen}
        vehicles={vehicles}
        customers={customers}
        onClose={() => setIsCreateWorkOrderOpen(false)}
        onSubmit={async (opts) => {
          const created = await createWorkOrder(opts);
          openWorkOrderTab(created.id, `${created.workOrderNumber} — ${created.vehicleDescriptionSnapshot}`);
        }}
      />
    </div>
  );
};
