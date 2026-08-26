import React, { useState, useEffect } from 'react';
import { ClipboardList, X, Check, Car, User, Gauge } from 'lucide-react';
import type {
  CreateWorkOrderOptions,
  CustomerRecord,
  VehicleRecord,
  WorkOrderStatus,
} from '@shared/automotiveTypes';

interface CreateWorkOrderModalProps {
  isOpen: boolean;
  vehicles: VehicleRecord[];
  customers: CustomerRecord[];
  initialVehicleId?: string;
  onClose: () => void;
  onSubmit: (options: CreateWorkOrderOptions) => Promise<void>;
}

const STATUS_OPTIONS: { value: WorkOrderStatus; label: string }[] = [
  { value: 'open', label: 'Open (Intake Ready)' },
  { value: 'diagnosing', label: 'Diagnosing' },
  { value: 'awaiting_approval', label: 'Awaiting Approval' },
  { value: 'waiting_parts', label: 'Waiting on Parts' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'draft', label: 'Draft Estimate' },
];

export const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  isOpen,
  vehicles,
  customers,
  initialVehicleId,
  onClose,
  onSubmit,
}) => {
  const [vehicleId, setVehicleId] = useState<string>(initialVehicleId || '');
  const [customerId, setCustomerId] = useState<string>('');
  const [status, setStatus] = useState<WorkOrderStatus>('open');
  const [odometerIn, setOdometerIn] = useState<string>('');
  const [customerConcern, setCustomerConcern] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When vehicle changes, auto-suggest owner and current mileage
  useEffect(() => {
    const selectedVehId = initialVehicleId || vehicleId || (vehicles[0]?.id ?? '');
    setVehicleId(selectedVehId);

    const vehicle = vehicles.find((v) => v.id === selectedVehId);
    if (vehicle) {
      setCustomerId(vehicle.customerId || '');
      if (vehicle.mileage !== undefined) {
        setOdometerIn(vehicle.mileage.toString());
      } else {
        setOdometerIn('');
      }
    }
  }, [initialVehicleId, vehicles, isOpen]);

  const handleVehicleChange = (newVehId: string) => {
    setVehicleId(newVehId);
    const vehicle = vehicles.find((v) => v.id === newVehId);
    if (vehicle) {
      setCustomerId(vehicle.customerId || '');
      setOdometerIn(vehicle.mileage !== undefined ? vehicle.mileage.toString() : '');
    } else {
      setCustomerId('');
      setOdometerIn('');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleId) {
      setError('Please select a vehicle for this Work Order');
      return;
    }

    if (!customerConcern.trim()) {
      setError('Customer concern / reason for service is required');
      return;
    }

    let parsedOdoIn: number | undefined = undefined;
    if (odometerIn.trim()) {
      parsedOdoIn = parseInt(odometerIn, 10);
      if (isNaN(parsedOdoIn) || parsedOdoIn < 0) {
        setError('Intake odometer must be a non-negative number');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        vehicleId,
        customerId: customerId ? customerId : null,
        status,
        odometerIn: parsedOdoIn,
        customerConcern: customerConcern.trim(),
        inspectionNotes: inspectionNotes.trim() || undefined,
      });

      setCustomerConcern('');
      setInspectionNotes('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-artemis-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-100">
            <ClipboardList className="w-4 h-4 text-bronze-400" />
            Open New Work Order
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          {/* Vehicle Selector */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-artemis-accent" />
              Target Vehicle <span className="text-red-400">*</span>
            </label>
            <select
              value={vehicleId}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-artemis-accent"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber} • {v.year ? `${v.year} ` : ''}{v.make} {v.model} {v.trim || ''} {v.licensePlate ? `[${v.licensePlate}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Customer / Owner at intake */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-artemis-accent" />
              Customer / Billing Contact
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-artemis-accent"
            >
              <option value="">— Unassigned / Shop / Walk-in —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customerNumber} • {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status & Intake Mileage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkOrderStatus)}
                className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-artemis-accent"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-zinc-500" />
                Intake Odometer (mi)
              </label>
              <input
                type="number"
                placeholder="e.g. 64250"
                value={odometerIn}
                onChange={(e) => setOdometerIn(e.target.value)}
                className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:outline-none focus:border-artemis-accent font-mono"
              />
            </div>
          </div>

          {/* Customer Concern (Required) */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Customer Concern / Stated Problem <span className="text-red-400">*</span>
            </label>
            <textarea
              placeholder="e.g. Grinding noise when braking from high speeds, check brake pads and fluid level..."
              rows={3}
              value={customerConcern}
              onChange={(e) => setCustomerConcern(e.target.value)}
              className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-artemis-accent resize-none"
            />
          </div>

          {/* Initial Inspection / Check-in Notes */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1">
              Intake & Inspection Notes
            </label>
            <textarea
              placeholder="Walkaround condition, warning lights on dashboard, fuel level..."
              rows={2}
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              className="w-full bg-artemis-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-artemis-accent resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !vehicleId || !customerConcern.trim()}
              className="px-4 py-1.5 rounded-lg bg-bronze-500 hover:bg-bronze-400 disabled:opacity-40 text-zinc-950 text-xs font-bold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? 'Creating…' : 'Open Work Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
