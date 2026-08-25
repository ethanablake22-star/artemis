import React, { useState } from 'react';
import {
  Car,
  User,
  Gauge,
  FileText,
  Edit2,
  Trash2,
  Check,
  ExternalLink,
  Cpu,
  UserX,
  ClipboardList,
  Plus,
  ArrowRight,
  Calendar,
  Clock,
  Calculator,
} from 'lucide-react';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useSchedule } from '../../../state/ScheduleContext';
import { useTabs } from '../../../state/TabContext';
import { CreateWorkOrderModal } from './CreateWorkOrderModal';
import { CreateEventModal } from '../schedule/CreateEventModal';
import { formatCents } from '@shared/currencyUtils';
import type { WorkOrderStatus } from '@shared/automotiveTypes';
import clsx from 'clsx';

interface VehicleDetailTabProps {
  vehicleId: string;
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

export const VehicleDetailTab: React.FC<VehicleDetailTabProps> = ({ vehicleId }) => {
  const {
    customers,
    vehicles,
    getVehicleById,
    getCustomerById,
    updateVehicle,
    deleteVehicle,
    getVehicleWorkOrders,
    getVehicleEstimates,
    createWorkOrder,
  } = useAutomotive();

  const {
    openCustomerTab,
    openWorkOrderTab,
    openScheduleEventTab,
    openEstimateTab,
    closeTab,
    syncVehicleTitle,
    activeTabId,
  } = useTabs();
  const { getVehicleEvents, createEvent } = useSchedule();

  const vehicle = getVehicleById(vehicleId);
  const owner = vehicle?.customerId ? getCustomerById(vehicle.customerId) : null;
  const workOrders = vehicle ? getVehicleWorkOrders(vehicle.id) : [];
  const vehicleEstimates = vehicle ? getVehicleEstimates(vehicle.id) : [];
  const vehicleEvents = vehicle ? getVehicleEvents(vehicle.id) : [];

  const [isEditing, setIsEditing] = useState(false);
  const [isCreateWOOpen, setIsCreateWOOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState<string>(vehicle?.customerId || '');
  const [year, setYear] = useState<string>(vehicle?.year ? vehicle.year.toString() : '');
  const [make, setMake] = useState(vehicle?.make || '');
  const [model, setModel] = useState(vehicle?.model || '');
  const [trim, setTrim] = useState(vehicle?.trim || '');
  const [engine, setEngine] = useState(vehicle?.engine || '');
  const [transmission, setTransmission] = useState(vehicle?.transmission || '');
  const [drivetrain, setDrivetrain] = useState(vehicle?.drivetrain || 'RWD');
  const [vin, setVin] = useState(vehicle?.vin || '');
  const [licensePlate, setLicensePlate] = useState(vehicle?.licensePlate || '');
  const [mileage, setMileage] = useState<string>(vehicle?.mileage?.toString() || '');
  const [color, setColor] = useState(vehicle?.color || '');
  const [notes, setNotes] = useState(vehicle?.notes || '');
  const [error, setError] = useState<string | null>(null);

  if (!vehicle) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-artemis-950 text-slate-400 text-xs p-6 text-center">
        <Car className="w-8 h-8 text-slate-600 mb-2" />
        <h4 className="text-sm font-bold text-slate-200">Vehicle Record Not Found</h4>
        <p className="text-slate-500 mt-1 max-w-sm">
          This vehicle record may have been removed or does not exist.
        </p>
      </div>
    );
  }

  const vehicleTitle = `${vehicle.year ? `${vehicle.year} ` : ''}${vehicle.make} ${vehicle.model}`;

  const handleStartEdit = () => {
    setCustomerId(vehicle.customerId || '');
    setYear(vehicle.year ? vehicle.year.toString() : '');
    setMake(vehicle.make);
    setModel(vehicle.model);
    setTrim(vehicle.trim || '');
    setEngine(vehicle.engine || '');
    setTransmission(vehicle.transmission || '');
    setDrivetrain(vehicle.drivetrain || 'RWD');
    setVin(vehicle.vin || '');
    setLicensePlate(vehicle.licensePlate || '');
    setMileage(vehicle.mileage !== undefined ? vehicle.mileage.toString() : '');
    setColor(vehicle.color || '');
    setNotes(vehicle.notes || '');
    setError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!make.trim() || !model.trim()) return;

    let parsedYear: number | undefined = undefined;
    if (year.trim()) {
      parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
        setError('Vehicle year must be between 1900 and 2100');
        return;
      }
    }

    setError(null);
    try {
      const updated = await updateVehicle(vehicle.id, {
        customerId: customerId ? customerId : null,
        year: parsedYear,
        make: make.trim(),
        model: model.trim(),
        trim: trim.trim() || undefined,
        engine: engine.trim() || undefined,
        transmission: transmission.trim() || undefined,
        drivetrain: drivetrain.trim() || undefined,
        vin: vin.trim() ? vin.trim().toUpperCase() : undefined,
        licensePlate: licensePlate.trim() ? licensePlate.trim().toUpperCase() : undefined,
        mileage: mileage ? parseInt(mileage, 10) : undefined,
        color: color.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      syncVehicleTitle(
        vehicle.id,
        `${updated.year ? `${updated.year} ` : ''}${updated.make} ${updated.model}`
      );
      setIsEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to archive ${vehicleTitle}?`)) {
      await deleteVehicle(vehicle.id);
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
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Car className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 truncate">
                {vehicleTitle}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800 font-bold">
                {vehicle.vehicleNumber}
              </span>
              {vehicle.trim && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {vehicle.trim}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 font-mono">
              <span>VIN: {vehicle.vin || 'None'}</span>
              <span>•</span>
              <span>Plate: {vehicle.licensePlate || '—'}</span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateWOOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Work Order
          </button>

          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Specs
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
            title="Archive Vehicle"
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl w-full mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Owner Card */}
          <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-artemis-accent" />
              Registered Owner
            </h3>

            {isEditing ? (
              <div className="space-y-1 text-xs">
                <label className="text-[10px] text-slate-500">Reassign Owner</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200 text-xs"
                >
                  <option value="">— Unassigned / Shop Vehicle —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerNumber} • {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : owner ? (
              <div
                onClick={() => openCustomerTab(owner.id, owner.name)}
                className="p-3.5 rounded-xl bg-artemis-950/80 border border-slate-800 hover:border-artemis-accent/40 cursor-pointer group transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-100 group-hover:text-artemis-accent transition-colors">
                      {owner.name}
                    </span>
                    {owner.isDeleted && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                        Archived Owner
                      </span>
                    )}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-artemis-accent transition-colors" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  {owner.customerNumber} • {owner.phone || owner.email || 'View Profile'}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-artemis-950/40 border border-slate-800/80 text-center space-y-1">
                <UserX className="w-5 h-5 text-slate-600 mx-auto" />
                <div className="text-xs font-semibold text-slate-400">Unassigned / Shop Vehicle</div>
                <div className="text-[10px] text-slate-600">No customer account currently linked.</div>
              </div>
            )}
          </div>

          {/* Core Specs Card */}
          <div className="md:col-span-2 p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-artemis-accent" />
              Vehicle Specifications
            </h3>

            {isEditing ? (
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500">Year</label>
                  <input
                    type="number"
                    value={year}
                    placeholder="Optional"
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Make *</label>
                  <input
                    type="text"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Model *</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Trim</label>
                  <input
                    type="text"
                    value={trim}
                    onChange={(e) => setTrim(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Odometer</label>
                  <input
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Plate</label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] text-slate-500">VIN (Globally Unique)</label>
                  <input
                    type="text"
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 rounded-lg bg-artemis-950/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Odometer</span>
                  <span className="text-sm font-bold text-slate-100 font-mono">
                    {vehicle.mileage !== undefined ? `${vehicle.mileage.toLocaleString()} mi` : '—'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-artemis-950/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Plate</span>
                  <span className="text-sm font-bold text-cyan-400 font-mono">
                    {vehicle.licensePlate || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-artemis-950/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Color</span>
                  <span className="text-sm font-semibold text-slate-200">
                    {vehicle.color || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-artemis-950/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-mono text-slate-500 block">Added</span>
                  <span className="text-sm font-mono text-slate-300">
                    {formatDate(vehicle.createdAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dedicated Powertrain Specifications */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-artemis-accent" />
            Powertrain Configuration
          </h3>

          {isEditing ? (
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-500">Engine</label>
                <input
                  type="text"
                  placeholder="e.g. 5.0L V8 M113"
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Transmission</label>
                <input
                  type="text"
                  placeholder="e.g. 722.9 7-Speed"
                  value={transmission}
                  onChange={(e) => setTransmission(e.target.value)}
                  className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500">Drivetrain</label>
                <select
                  value={drivetrain}
                  onChange={(e) => setDrivetrain(e.target.value)}
                  className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                >
                  <option value="RWD">RWD</option>
                  <option value="AWD">AWD</option>
                  <option value="4WD">4WD</option>
                  <option value="FWD">FWD</option>
                  <option value="EV">EV / Dual Motor</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-artemis-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Engine</span>
                <span className="text-xs font-semibold text-slate-200">
                  {vehicle.engine || 'Not specified'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-artemis-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Transmission</span>
                <span className="text-xs font-semibold text-slate-200">
                  {vehicle.transmission || 'Not specified'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-artemis-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Drivetrain</span>
                <span className="text-xs font-semibold text-cyan-400 font-mono">
                  {vehicle.drivetrain || 'RWD'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live Service History / Work Orders */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Service History & Work Orders ({workOrders.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateWOOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              New Work Order
            </button>
          </div>

          {workOrders.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs italic bg-artemis-950/40 rounded-xl border border-slate-800/60">
              No work orders or service records recorded for this vehicle.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-artemis-950/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-artemis-950 text-slate-400 font-medium">
                    <th className="py-2.5 px-3">Work Order #</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Concern / Service Description</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((wo) => {
                    const badge = STATUS_BADGES[wo.status] || STATUS_BADGES.open;
                    return (
                      <tr
                        key={wo.id}
                        onClick={() => openWorkOrderTab(wo.id, `${wo.workOrderNumber} — ${vehicleTitle}`)}
                        className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400 group-hover:underline">
                          {wo.workOrderNumber}
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
                        <td className="py-2.5 px-3 text-slate-200 truncate max-w-xs">
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

        {/* Commercial Estimates */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-teal-400" />
              Commercial Estimates ({vehicleEstimates.length})
            </h3>
          </div>

          {vehicleEstimates.length === 0 ? (
            <p className="text-xs text-slate-500 italic bg-artemis-950/40 p-3 rounded-lg">
              No commercial estimates generated for this vehicle.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vehicleEstimates.map((est) => (
                <div
                  key={est.id}
                  onClick={() =>
                    openEstimateTab(
                      est.id,
                      `${est.estimateNumber} — ${est.vehicleDescriptionSnapshot}`
                    )
                  }
                  className="p-3 rounded-lg bg-artemis-950/80 border border-slate-800 hover:border-teal-500/40 cursor-pointer group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-teal-400 font-mono">
                      {est.estimateNumber}
                    </span>
                    <span
                      className={clsx(
                        'text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border',
                        est.status === 'approved'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                          : est.status === 'declined'
                            ? 'bg-red-950/60 text-red-400 border-red-800/80'
                            : est.status === 'ready'
                              ? 'bg-blue-950/60 text-blue-400 border-blue-800/80'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                      )}
                    >
                      {est.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm font-black text-white font-mono">
                      {formatCents(est.totalCents)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {est.workOrderNumberSnapshot} ·{' '}
                      {new Date(est.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              Scheduled Appointments ({vehicleEvents.length})
            </h3>
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold"
            >
              <Plus className="w-3 h-3" />
              Schedule Appointment
            </button>
          </div>

          {vehicleEvents.length === 0 ? (
            <p className="text-xs text-slate-500 italic bg-artemis-950/40 p-3 rounded-lg">
              No appointments scheduled for this vehicle.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {vehicleEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => openScheduleEventTab(ev.id, `${ev.eventNumber} — ${ev.title}`)}
                  className="p-3 rounded-lg bg-artemis-950/80 border border-slate-800 hover:border-rose-500/40 cursor-pointer group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-rose-400 font-mono">
                      {ev.eventNumber}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded">
                      {ev.status}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-200 group-hover:text-rose-300 transition-colors mt-1">
                    {ev.title}
                  </h5>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono flex items-center gap-2">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>
                      {new Date(ev.startAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}{' '}
                      {ev.allDay
                        ? '(All Day)'
                        : `${new Date(ev.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${new Date(ev.endAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* General Vehicle Notes */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-artemis-accent" />
            General Vehicle Notes
          </h3>
          {isEditing ? (
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-artemis-950 border border-slate-700 rounded p-2 text-xs text-slate-200 resize-none"
            />
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed">
              {vehicle.notes || 'No vehicle notes recorded.'}
            </p>
          )}
        </div>
      </div>

      {/* Create Work Order Modal */}
      <CreateWorkOrderModal
        isOpen={isCreateWOOpen}
        vehicles={vehicles}
        customers={customers}
        initialVehicleId={vehicle.id}
        onClose={() => setIsCreateWOOpen(false)}
        onSubmit={async (opts) => {
          const created = await createWorkOrder(opts);
          openWorkOrderTab(created.id, `${created.workOrderNumber} — ${vehicleTitle}`);
        }}
      />

      {/* Schedule Event Modal */}
      <CreateEventModal
        isOpen={isScheduleModalOpen}
        initialVehicleId={vehicle.id}
        initialCustomerId={vehicle.customerId || undefined}
        initialTitle={`Appointment: ${vehicleTitle}`}
        onClose={() => setIsScheduleModalOpen(false)}
        onSubmit={async (opts) => {
          const created = await createEvent(opts);
          openScheduleEventTab(created.id, `${created.eventNumber} — ${created.title}`);
        }}
      />
    </div>
  );
};
