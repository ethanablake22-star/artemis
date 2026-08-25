import React, { useState } from 'react';
import {
  User,
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
} from 'lucide-react';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useTabs } from '../../../state/TabContext';
import { CreateVehicleModal } from './CreateVehicleModal';

interface CustomerDetailTabProps {
  customerId: string;
}

export const CustomerDetailTab: React.FC<CustomerDetailTabProps> = ({ customerId }) => {
  const {
    customers,
    getCustomerById,
    getCustomerVehicles,
    updateCustomer,
    deleteCustomer,
    createVehicle,
  } = useAutomotive();

  const { openVehicleTab, closeTab, syncCustomerTitle, activeTabId } = useTabs();

  const customer = getCustomerById(customerId);
  const vehicles = getCustomerVehicles(customerId);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
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
    setName(customer.name);
    setPhone(customer.phone || '');
    setEmail(customer.email || '');
    setAddress(customer.address || '');
    setNotes(customer.notes || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!name.trim()) return;
    try {
      await updateCustomer(customer.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      syncCustomerTitle(customer.id, name.trim());
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to update customer:', e);
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete customer "${customer.name}" and all associated vehicles?`
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
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 truncate">
                {customer.name}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Customer Record
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 font-mono">
              <span>ID: {customer.id.substring(0, 8)}…</span>
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
            title="Delete Customer"
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
              Contact Details
            </h3>

            {isEditing ? (
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
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
              </div>
            ) : (
              <div className="space-y-2 text-xs">
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
                <span className="text-slate-500">Registered Vehicles</span>
                <span className="font-bold text-slate-200">{vehicles.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-500">Member Since</span>
                <span className="font-mono text-slate-300">{formatDate(customer.createdAt)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Last Profile Update</span>
                <span className="font-mono text-slate-300">{formatDate(customer.updatedAt)}</span>
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
              {vehicles.map((v) => (
                <div
                  key={v.id}
                  onClick={() => openVehicleTab(v.id, `${v.year} ${v.make} ${v.model}`)}
                  className="group p-4 rounded-xl bg-artemis-900 border border-slate-800 hover:border-artemis-accent/40 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-950/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-cyan-500/10 group-hover:text-cyan-400 text-slate-400 transition-colors">
                        <Car className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-artemis-accent transition-colors">
                          {v.year} {v.make} {v.model}
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
              ))}
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
