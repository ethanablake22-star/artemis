import React, { useState, useEffect } from 'react';
import { Car, X, Check } from 'lucide-react';
import type { CreateVehicleOptions, CustomerRecord } from '@shared/automotiveTypes';

interface CreateVehicleModalProps {
  isOpen: boolean;
  customers: CustomerRecord[];
  initialCustomerId?: string | null;
  onClose: () => void;
  onSubmit: (options: CreateVehicleOptions) => Promise<void>;
}

export const CreateVehicleModal: React.FC<CreateVehicleModalProps> = ({
  isOpen,
  customers,
  initialCustomerId,
  onClose,
  onSubmit,
}) => {
  const [customerId, setCustomerId] = useState<string>(initialCustomerId || '');
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [trim, setTrim] = useState('');
  const [engine, setEngine] = useState('');
  const [transmission, setTransmission] = useState('');
  const [drivetrain, setDrivetrain] = useState('RWD');
  const [vin, setVin] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [mileage, setMileage] = useState('');
  const [color, setColor] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCustomerId !== undefined) {
      setCustomerId(initialCustomerId || '');
    }
  }, [initialCustomerId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!make.trim()) {
      setError('Vehicle make is required (e.g. Mercedes, Ford)');
      return;
    }

    if (!model.trim()) {
      setError('Vehicle model is required (e.g. SL500, Civic)');
      return;
    }

    let parsedYear: number | undefined = undefined;
    if (year.trim()) {
      parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
        setError('Please enter a valid 4-digit model year between 1900 and 2100');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
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

      // Reset form
      setMake('');
      setModel('');
      setTrim('');
      setEngine('');
      setTransmission('');
      setVin('');
      setLicensePlate('');
      setMileage('');
      setColor('');
      setNotes('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-artemis-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Car className="w-4 h-4 text-artemis-accent" />
            Add New Vehicle
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
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
          {/* Owner Selector */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Vehicle Owner (Customer)
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-artemis-accent"
            >
              <option value="">— Unassigned / Shop / Project Vehicle —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customerNumber} • {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Year / Make / Model / Trim */}
          <div className="grid grid-cols-4 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Year
              </label>
              <input
                type="number"
                placeholder="2006"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-100 focus:outline-none focus:border-artemis-accent"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Make <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Mercedes"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-100 focus:outline-none focus:border-artemis-accent"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Model <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="SL500"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-100 focus:outline-none focus:border-artemis-accent"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Trim
              </label>
              <input
                type="text"
                placeholder="AMG / Base"
                value={trim}
                onChange={(e) => setTrim(e.target.value)}
                className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-2.5 py-2 text-slate-100 focus:outline-none focus:border-artemis-accent"
              />
            </div>
          </div>

          {/* Powertrain: Engine / Transmission / Drivetrain */}
          <div className="p-3 bg-artemis-950/80 rounded-xl border border-slate-800 space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Powertrain Specifications
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">
                  Engine
                </label>
                <input
                  type="text"
                  placeholder="5.0L V8 M113"
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  className="w-full bg-artemis-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-artemis-accent text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">
                  Transmission
                </label>
                <input
                  type="text"
                  placeholder="722.9 7-Speed"
                  value={transmission}
                  onChange={(e) => setTransmission(e.target.value)}
                  className="w-full bg-artemis-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-artemis-accent text-[11px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">
                  Drivetrain
                </label>
                <select
                  value={drivetrain}
                  onChange={(e) => setDrivetrain(e.target.value)}
                  className="w-full bg-artemis-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-artemis-accent text-[11px]"
                >
                  <option value="RWD">RWD</option>
                  <option value="AWD">AWD</option>
                  <option value="4WD">4WD</option>
                  <option value="FWD">FWD</option>
                  <option value="EV">EV / Dual Motor</option>
                </select>
              </div>
            </div>
          </div>

          {/* VIN / Plate / Mileage / Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                VIN (Globally Unique)
              </label>
              <input
                type="text"
                placeholder="WDBSK75F76F..."
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-artemis-accent"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                License Plate
              </label>
              <input
                type="text"
                placeholder="7XYZ123"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-artemis-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Odometer Mileage
              </label>
              <input
                type="number"
                placeholder="64250"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-artemis-accent"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Color
              </label>
              <input
                type="text"
                placeholder="Obsidian Black"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-artemis-accent"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              General Vehicle Notes
            </label>
            <textarea
              placeholder="ABC suspension notes, key codes, aftermarket modifications..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-artemis-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-artemis-accent resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !make.trim() || !model.trim()}
              className="px-4 py-1.5 rounded-lg bg-artemis-accent hover:bg-sky-400 disabled:opacity-40 text-slate-950 text-xs font-bold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? 'Registering…' : 'Register Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
