import React, { useState } from 'react';
import {
  Users,
  Car,
  Search,
  Plus,
  ArrowUpRight,
  Phone,
  Mail,
  Building2,
  User,
  ClipboardList,
  CheckCircle2,
} from 'lucide-react';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useTabs } from '../../../state/TabContext';
import { CreateCustomerModal } from './CreateCustomerModal';
import { CreateVehicleModal } from './CreateVehicleModal';
import { CreateWorkOrderModal } from './CreateWorkOrderModal';
import type {
  CustomerRecord,
  VehicleRecord,
  WorkOrderRecord,
  WorkOrderStatus,
} from '@shared/automotiveTypes';
import clsx from 'clsx';

const STATUS_BADGES: Record<
  WorkOrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  draft: { label: 'Draft', bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' },
  open: { label: 'Open', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  diagnosing: { label: 'Diagnosing', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  awaiting_approval: { label: 'Awaiting Approval', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  waiting_parts: { label: 'Waiting Parts', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  in_progress: { label: 'In Progress', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  completed: { label: 'Completed', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

export const AutomotiveHubTab: React.FC = () => {
  const {
    customers,
    vehicles,
    workOrders,
    createCustomer,
    createVehicle,
    createWorkOrder,
    getCustomerVehicles,
    getCustomerById,
  } = useAutomotive();

  const { openCustomerTab, openVehicleTab, openWorkOrderTab } = useTabs();

  const [activeSection, setActiveSection] = useState<'customers' | 'vehicles' | 'workOrders'>('workOrders');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);
  const [isCreateWorkOrderOpen, setIsCreateWorkOrderOpen] = useState(false);

  // Status Metrics
  const activeWorkOrdersCount = workOrders.filter(
    (w) => w.status !== 'completed' && w.status !== 'cancelled'
  ).length;
  const completedWorkOrdersCount = workOrders.filter((w) => w.status === 'completed').length;

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

  return (
    <div className="h-full w-full bg-artemis-950 flex flex-col overflow-hidden text-slate-100 select-none">
      {/* Top Header Strip */}
      <div className="h-14 bg-artemis-950 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Automotive Operations
            </h1>
            <p className="text-[11px] text-slate-500 font-mono">
              Work Orders, Vehicle Fleet & Customer Directory
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateWorkOrderOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Work Order
          </button>
          <button
            type="button"
            onClick={() => setIsCreateCustomerOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-artemis-accent/15 hover:bg-artemis-accent/25 text-artemis-accent border border-artemis-accent/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Customer
          </button>
          <button
            type="button"
            onClick={() => setIsCreateVehicleOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Vehicle
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl w-full mx-auto">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div
            onClick={() => {
              setActiveSection('workOrders');
              setStatusFilter('all');
            }}
            className="p-4 rounded-xl bg-artemis-900/90 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-emerald-500/40 transition-colors"
          >
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-500 font-bold block">
                Active Work Orders
              </span>
              <span className="text-2xl font-bold text-emerald-400 mt-0.5 block font-mono">
                {activeWorkOrdersCount}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => {
              setActiveSection('workOrders');
              setStatusFilter('completed');
            }}
            className="p-4 rounded-xl bg-artemis-900/90 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-cyan-500/40 transition-colors"
          >
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-500 font-bold block">
                Completed Repairs
              </span>
              <span className="text-2xl font-bold text-cyan-400 mt-0.5 block font-mono">
                {completedWorkOrdersCount}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setActiveSection('vehicles')}
            className="p-4 rounded-xl bg-artemis-900/90 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-indigo-500/40 transition-colors"
          >
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-500 font-bold block">
                Tracked Vehicles
              </span>
              <span className="text-2xl font-bold text-slate-100 mt-0.5 block font-mono">
                {vehicles.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Car className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setActiveSection('customers')}
            className="p-4 rounded-xl bg-artemis-900/90 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-cyan-500/40 transition-colors"
          >
            <div>
              <span className="text-[10px] uppercase font-mono text-slate-500 font-bold block">
                Customer Accounts
              </span>
              <span className="text-2xl font-bold text-slate-100 mt-0.5 block font-mono">
                {customers.length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Directory Navigation & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Section Toggle */}
          <div className="flex items-center p-1 bg-artemis-900 rounded-xl border border-slate-800 w-fit">
            <button
              type="button"
              onClick={() => setActiveSection('workOrders')}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2',
                activeSection === 'workOrders'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Work Orders ({workOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('vehicles')}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2',
                activeSection === 'vehicles'
                  ? 'bg-artemis-accent/20 text-artemis-accent border border-artemis-accent/30'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Car className="w-3.5 h-3.5" />
              Vehicles ({vehicles.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('customers')}
              className={clsx(
                'px-4 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2',
                activeSection === 'customers'
                  ? 'bg-artemis-accent/20 text-artemis-accent border border-artemis-accent/30'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Users className="w-3.5 h-3.5" />
              Customers ({customers.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeSection === 'workOrders'
                  ? 'Search by WO-#, vehicle, concern...'
                  : activeSection === 'customers'
                  ? 'Search by name, CUS-#, phone...'
                  : 'Search by make, model, VEH-#, VIN...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-artemis-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-artemis-accent/60"
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
                      ? 'bg-slate-800 text-slate-100 border border-slate-700'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {filteredWorkOrders.length === 0 ? (
              <div className="p-12 rounded-2xl border border-slate-800 bg-artemis-900/40 text-center flex flex-col items-center justify-center">
                <ClipboardList className="w-10 h-10 text-slate-600 mb-2" />
                <h3 className="text-sm font-bold text-slate-300">No Work Orders Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No work order records match the active filter.'
                    : 'Open your first automotive work order to start recording service history.'}
                </p>
                {!searchQuery && statusFilter === 'all' && (
                  <button
                    type="button"
                    onClick={() => setIsCreateWorkOrderOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-400"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Open Work Order
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-artemis-900/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-artemis-950/80 text-slate-400 font-medium">
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
                          className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-emerald-400 group-hover:underline">
                                {wo.workOrderNumber}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-200 block">
                              {wo.vehicleDescriptionSnapshot}
                            </span>
                            {wo.vinSnapshot && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                VIN: {wo.vinSnapshot}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {wo.customerNameSnapshot ? (
                              <span className="font-semibold text-slate-200">
                                {wo.customerNameSnapshot}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Unassigned</span>
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
                          <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                            {wo.customerConcern}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                            {formatDate(wo.openedAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenWorkOrder(wo);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              Open Tab
                              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
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

        {/* Section 2: Customers Table */}
        {activeSection === 'customers' && (
          <div className="space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="p-12 rounded-2xl border border-slate-800 bg-artemis-900/40 text-center flex flex-col items-center justify-center">
                <Users className="w-10 h-10 text-slate-600 mb-2" />
                <h3 className="text-sm font-bold text-slate-300">No Customers Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchQuery
                    ? 'No customer records match your search filter.'
                    : 'Get started by registering your first customer profile.'}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => setIsCreateCustomerOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-artemis-accent text-slate-950 text-xs font-bold flex items-center gap-1.5 hover:bg-sky-400"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Customer
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-artemis-900/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-artemis-950/80 text-slate-400 font-medium">
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
                          className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                                {customer.type === 'business' ? (
                                  <Building2 className="w-4 h-4" />
                                ) : (
                                  <User className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-bold text-cyan-400">
                                    {customer.customerNumber}
                                  </span>
                                </div>
                                <span className="font-bold text-slate-200 group-hover:text-artemis-accent transition-colors block">
                                  {customer.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {customer.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <div className="space-y-0.5">
                              {customer.phone && (
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                              {customer.email && (
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                  <Mail className="w-3 h-3 text-slate-500" />
                                  <span className="truncate max-w-[180px]">{customer.email}</span>
                                </div>
                              )}
                              {!customer.phone && !customer.email && (
                                <span className="text-slate-600 italic text-[11px]">No contact</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-mono">
                              {fleet.length} {fleet.length === 1 ? 'vehicle' : 'vehicles'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {formatDate(customer.createdAt)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCustomer(customer);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              Open Tab
                              <ArrowUpRight className="w-3 h-3 text-artemis-accent" />
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

        {/* Section 3: Vehicles Table */}
        {activeSection === 'vehicles' && (
          <div className="space-y-3">
            {filteredVehicles.length === 0 ? (
              <div className="p-12 rounded-2xl border border-slate-800 bg-artemis-900/40 text-center flex flex-col items-center justify-center">
                <Car className="w-10 h-10 text-slate-600 mb-2" />
                <h3 className="text-sm font-bold text-slate-300">No Vehicles Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  {searchQuery
                    ? 'No vehicle records match your search filter.'
                    : 'Register your vehicles to start tracking specs, mileage, and service records.'}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => setIsCreateVehicleOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-artemis-accent text-slate-950 text-xs font-bold flex items-center gap-1.5 hover:bg-sky-400"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Vehicle
                  </button>
                )}
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-artemis-900/60">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-artemis-950/80 text-slate-400 font-medium">
                      <th className="py-3 px-4">Vehicle / Number</th>
                      <th className="py-3 px-4">Owner</th>
                      <th className="py-3 px-4">Plate / VIN</th>
                      <th className="py-3 px-4">Mileage</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.map((vehicle) => {
                      const owner = vehicle.customerId ? getCustomerById(vehicle.customerId) : null;
                      const title = `${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.make} ${vehicle.model}`;
                      return (
                        <tr
                          key={vehicle.id}
                          onDoubleClick={() => handleOpenVehicle(vehicle)}
                          className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors group"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                                <Car className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-bold text-indigo-400">
                                    {vehicle.vehicleNumber}
                                  </span>
                                </div>
                                <span className="font-bold text-slate-200 group-hover:text-artemis-accent transition-colors block">
                                  {title}
                                </span>
                                {vehicle.trim && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {vehicle.trim}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {owner ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCustomer(owner);
                                  }}
                                  className="text-xs font-semibold text-cyan-400 hover:underline"
                                >
                                  {owner.name}
                                </button>
                                {owner.isDeleted && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                    Archived
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                            <div>{vehicle.licensePlate || 'No Plate'}</div>
                            {vehicle.vin && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                {vehicle.vin}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
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
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1"
                            >
                              Open Tab
                              <ArrowUpRight className="w-3 h-3 text-artemis-accent" />
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
