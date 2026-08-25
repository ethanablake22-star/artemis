import React, { useState } from 'react';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Car,
  Plus,
  Edit2,
  Trash2,
  Check,
  Layers,
  ArrowRight,
  ClipboardList,
} from 'lucide-react';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useTabs } from '../../../state/TabContext';
import { CreateVehicleModal } from './CreateVehicleModal';
import type { CustomerType, WorkOrderStatus } from '@shared/automotiveTypes';
import clsx from 'clsx';

interface CustomerDetailTabProps {
  customerId: string;
}

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

export const CustomerDetailTab: React.FC<CustomerDetailTabProps> = ({ customerId }) => {
  const {
    customers,
    getCustomerById,
    getCustomerVehicles,
    updateCustomer,
    deleteCustomer,
    createVehicle,
    getCustomerWorkOrders,
  } = useAutomotive();

  const { openVehicleTab, openWorkOrderTab, closeTab, syncCustomerTitle, activeTabId } = useTabs();

  const customer = getCustomerById(customerId);
  const vehicles = getCustomerVehicles(customerId);
  const workOrders = customer ? getCustomerWorkOrders(customer.id) : [];

  const [isEditing, setIsEditing] = useState(false);
  const [type, setType] = useState<CustomerType>(customer?.type || 'individual');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);

  if (!customer) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-artemis-950 text-slate-400 text-xs p-6 text-center">
        <User className="w-8 h-8 text-slate-600 mb-2" />
        <h4 className="text-sm font-bold text-slate-200">Customer Record Not Found</h4>
        <p className="text-slate-500 mt-1 max-w-sm">
          This customer record may have been removed or does not exist.
        </p>
      </div>
    );
  }

  const handleStartEdit = () => {
    setType(customer.type || 'individual');
    setFirstName(customer.firstName || '');
    setLastName(customer.lastName || '');
    setBusinessName(customer.businessName || '');
    setContactPerson(customer.contactPerson || '');
    setPhone(customer.phone || '');
    setEmail(customer.email || '');
    setAddress(customer.address || '');
    setNotes(customer.notes || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      const updated = await updateCustomer(customer.id, {
        type,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        businessName: businessName.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      syncCustomerTitle(customer.id, updated.name);
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to update customer:', e);
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to archive customer "${customer.name}"? (Note: Owned vehicles and work orders will remain in the system and will not be deleted).`
      )
    ) {
      await deleteCustomer(customer.id);
      closeTab(activeTabId);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="h-full w-full bg-artemis-950 flex flex-col overflow-hidden text-slate-100 select-none">
      {/* Top Header Bar */}
      <div className="h-14 bg-artemis-950 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            {customer.type === 'business' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 truncate">
                {customer.name}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold">
                {customer.customerNumber}
              </span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                {customer.type}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 font-mono">
              <span>UUID: {customer.id.substring(0, 8)}…</span>
              <span>•</span>
              <span>Added: {formatDate(customer.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleDelete}
            title="Archive Customer"
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl w-full mx-auto">
        {/* Customer Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Contact Details */}
          <div className="p-4 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-artemis-accent" />
              Contact & Identity
            </h3>

            {isEditing ? (
              <div className="space-y-2 text-xs">
                <div className="flex gap-1 p-0.5 bg-artemis-950 rounded border border-slate-800 mb-2">
                  <button
                    type="button"
                    onClick={() => setType('individual')}
                    className={clsx(
                      'flex-1 py-1 rounded text-[11px] font-semibold',
                      type === 'individual' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500'
                    )}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('business')}
                    className={clsx(
                      'flex-1 py-1 rounded text-[11px] font-semibold',
                      type === 'business' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500'
                    )}
                  >
                    Business
                  </button>
                </div>

                {type === 'individual' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-500">Business Name</label>
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500">Contact Person</label>
                      <input
                        type="text"
                        value={contactPerson}
                        onChange={(e) => setContactPerson(e.target.value)}
                        className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-500">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Email</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {customer.type === 'business' && customer.contactPerson && (
                  <div className="flex items-center gap-2.5 text-slate-300">
                    <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Contact: {customer.contactPerson}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{customer.phone || 'No phone recorded'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{customer.email || 'No email recorded'}</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{customer.address || 'No address recorded'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Account Overview */}
          <div className="p-4 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-artemis-accent" />
              Account Overview
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Customer Number</span>
                <span className="font-mono font-bold text-cyan-400">{customer.customerNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Registered Vehicles</span>
                <span className="font-bold text-slate-200">{vehicles.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Service Work Orders</span>
                <span className="font-bold text-emerald-400">{workOrders.length}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Member Since</span>
                <span className="font-mono text-slate-300">{formatDate(customer.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Preferences */}
          <div className="p-4 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-artemis-accent" />
              Customer Notes
            </h3>
            {isEditing ? (
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-artemis-950 border border-slate-700 rounded p-2 text-xs text-slate-200 resize-none"
              />
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed italic">
                {customer.notes || 'No customer notes added.'}
              </p>
            )}
          </div>
        </div>

        {/* Assigned Vehicle Fleet */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Customer Vehicles ({vehicles.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateVehicleOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-artemis-accent/15 hover:bg-artemis-accent/25 text-artemis-accent border border-artemis-accent/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Vehicle
            </button>
          </div>

          {vehicles.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-slate-800 bg-artemis-900/40 text-center flex flex-col items-center justify-center">
              <Car className="w-8 h-8 text-slate-600 mb-2" />
              <div className="text-xs font-bold text-slate-300">No Vehicles Assigned</div>
              <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                Register this customer's cars, trucks, or equipment to track service history and specs.
              </p>
              <button
                type="button"
                onClick={() => setIsCreateVehicleOpen(true)}
                className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-artemis-accent" />
                Register First Vehicle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {vehicles.map((v) => {
                const title = `${v.year ? `${v.year} ` : ''}${v.make} ${v.model}`;
                return (
                  <div
                    key={v.id}
                    onClick={() => openVehicleTab(v.id, title)}
                    className="group p-4 rounded-xl bg-artemis-900 border border-slate-800 hover:border-artemis-accent/40 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-950/20"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 text-slate-400 transition-colors">
                          <Car className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono font-bold text-indigo-400">
                              {v.vehicleNumber}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-100 group-hover:text-artemis-accent transition-colors">
                            {title}
                          </h4>
                          {v.trim && (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {v.trim}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-artemis-accent group-hover:translate-x-0.5 transition-all" />
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                      <div>
                        <span className="text-slate-600 block text-[9px] uppercase">License Plate</span>
                        <span className="text-slate-200 font-bold">{v.licensePlate || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 block text-[9px] uppercase">Mileage</span>
                        <span className="text-slate-200">{v.mileage ? `${v.mileage.toLocaleString()} mi` : '—'}</span>
                      </div>
                    </div>

                    {v.vin && (
                      <div className="mt-2 text-[10px] font-mono text-slate-500 truncate">
                        VIN: {v.vin}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer Service Work Orders */}
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Customer Work Orders ({workOrders.length})
            </h3>
          </div>

          {workOrders.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs italic bg-artemis-900/40 rounded-xl border border-slate-800/60">
              No work orders recorded for this customer account.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-artemis-900/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-artemis-950 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">Work Order #</th>
                    <th className="py-2.5 px-3">Vehicle</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Concern</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((wo) => {
                    const badge = STATUS_BADGES[wo.status] || STATUS_BADGES.open;
                    return (
                      <tr
                        key={wo.id}
                        onClick={() =>
                          openWorkOrderTab(
                            wo.id,
                            `${wo.workOrderNumber} — ${wo.vehicleDescriptionSnapshot}`
                          )
                        }
                        className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 group-hover:underline">
                          {wo.workOrderNumber}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {wo.vehicleDescriptionSnapshot}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={clsx(
                              'text-[10px] font-bold px-2 py-0.5 rounded border',
                              badge.bg,
                              badge.text,
                              badge.border
                            )}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                          {formatDate(wo.openedAt)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 truncate max-w-xs">
                          {wo.customerConcern}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="text-slate-500 group-hover:text-artemis-accent text-[11px] font-semibold inline-flex items-center gap-1">
                            Open
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Register Vehicle Modal */}
      <CreateVehicleModal
        isOpen={isCreateVehicleOpen}
        customers={customers}
        initialCustomerId={customer.id}
        onClose={() => setIsCreateVehicleOpen(false)}
        onSubmit={async (opts) => {
          await createVehicle(opts);
        }}
      />
    </div>
  );
};
