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
} from 'lucide-react';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useTabs } from '../../../state/TabContext';

interface VehicleDetailTabProps {
  vehicleId: string;
}

export const VehicleDetailTab: React.FC<VehicleDetailTabProps> = ({ vehicleId }) => {
  const {
    getVehicleById,
    getCustomerById,
    updateVehicle,
    deleteVehicle,
  } = useAutomotive();

  const { openCustomerTab, closeTab, syncVehicleTitle, activeTabId } = useTabs();

  const vehicle = getVehicleById(vehicleId);
  const owner = vehicle ? getCustomerById(vehicle.customerId) : undefined;

  const [isEditing, setIsEditing] = useState(false);
  const [year, setYear] = useState<number>(vehicle?.year || 2026);
  const [make, setMake] = useState(vehicle?.make || '');
  const [model, setModel] = useState(vehicle?.model || '');
  const [trim, setTrim] = useState(vehicle?.trim || '');
  const [vin, setVin] = useState(vehicle?.vin || '');
  const [licensePlate, setLicensePlate] = useState(vehicle?.licensePlate || '');
  const [mileage, setMileage] = useState<string>(vehicle?.mileage?.toString() || '');
  const [color, setColor] = useState(vehicle?.color || '');
  const [notes, setNotes] = useState(vehicle?.notes || '');

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

  const handleStartEdit = () => {
    setYear(vehicle.year);
    setMake(vehicle.make);
    setModel(vehicle.model);
    setTrim(vehicle.trim || '');
    setVin(vehicle.vin || '');
    setLicensePlate(vehicle.licensePlate || '');
    setMileage(vehicle.mileage ? vehicle.mileage.toString() : '');
    setColor(vehicle.color || '');
    setNotes(vehicle.notes || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!make.trim() || !model.trim()) return;
    try {
      await updateVehicle(vehicle.id, {
        year,
        make: make.trim(),
        model: model.trim(),
        trim: trim.trim() || undefined,
        vin: vin.trim().toUpperCase() || undefined,
        licensePlate: licensePlate.trim().toUpperCase() || undefined,
        mileage: mileage ? parseInt(mileage, 10) : undefined,
        color: color.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      syncVehicleTitle(vehicle.id, `${year} ${make.trim()} ${model.trim()}`);
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to update vehicle:', e);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete this ${vehicle.year} ${vehicle.make} ${vehicle.model}?`)) {
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
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h2>
              {vehicle.trim && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {vehicle.trim}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 font-mono">
              <span>VIN: {vehicle.vin || 'Not specified'}</span>
              <span>•</span>
              <span>Plate: {vehicle.licensePlate || '—'}</span>
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
            title="Delete Vehicle"
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl w-full mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Owner Card */}
          <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-artemis-accent" />
              Registered Owner
            </h3>

            {owner ? (
              <div
                onClick={() => openCustomerTab(owner.id, owner.name)}
                className="p-3.5 rounded-xl bg-artemis-950/80 border border-slate-800 hover:border-artemis-accent/40 cursor-pointer group transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-slate-100 group-hover:text-artemis-accent transition-colors">
                    {owner.name}
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-artemis-accent transition-colors" />
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  {owner.phone || owner.email || 'View Profile'}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">No owner information</div>
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
                    onChange={(e) => setYear(parseInt(e.target.value, 10))}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Make</label>
                  <input
                    type="text"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Model</label>
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
                  <label className="text-[10px] text-slate-500">VIN</label>
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
                    {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : '—'}
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

        {/* Notes & Powertrain Details */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-artemis-accent" />
            Powertrain, Options & Service Notes
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
              {vehicle.notes || 'No powertrain specifications or vehicle notes recorded.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
