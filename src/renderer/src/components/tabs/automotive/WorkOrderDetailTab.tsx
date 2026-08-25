import React, { useState } from 'react';
import {
  ClipboardList,
  User,
  Car,
  Gauge,
  Clock,
  Wrench,
  Package,
  FileText,
  CheckCircle2,
  Trash2,
  Edit2,
  Check,
  Plus,
  ExternalLink,
  X,
  Calendar,
} from 'lucide-react';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useSchedule } from '../../../state/ScheduleContext';
import { useTabs } from '../../../state/TabContext';
import { CreateEventModal } from '../schedule/CreateEventModal';
import type {
  WorkOrderStatus,
  WorkOrderLaborLine,
  WorkOrderPartLine,
} from '@shared/automotiveTypes';
import clsx from 'clsx';

interface WorkOrderDetailTabProps {
  workOrderId: string;
}

const STATUS_CONFIG: Record<
  WorkOrderStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  draft: {
    label: 'Draft',
    bg: 'bg-slate-800/80',
    text: 'text-slate-400',
    border: 'border-slate-700',
  },
  open: {
    label: 'Open',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  diagnosing: {
    label: 'Diagnosing',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  awaiting_approval: {
    label: 'Awaiting Approval',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  waiting_parts: {
    label: 'Waiting on Parts',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  in_progress: {
    label: 'In Progress',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
};

export const WorkOrderDetailTab: React.FC<WorkOrderDetailTabProps> = ({ workOrderId }) => {
  const {
    getWorkOrderById,
    getVehicleById,
    getCustomerById,
    updateWorkOrder,
    deleteWorkOrder,
  } = useAutomotive();

  const { openCustomerTab, openVehicleTab, openScheduleEventTab, closeTab, activeTabId } = useTabs();
  const { getWorkOrderEvents, createEvent } = useSchedule();

  const workOrder = getWorkOrderById(workOrderId);
  const liveVehicle = workOrder ? getVehicleById(workOrder.vehicleId) : undefined;
  const liveCustomer = workOrder?.customerId ? getCustomerById(workOrder.customerId) : undefined;
  const woEvents = workOrder ? getWorkOrderEvents(workOrder.id) : [];

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Editable sections
  const [isEditingConcern, setIsEditingConcern] = useState(false);
  const [customerConcern, setCustomerConcern] = useState('');

  const [isEditingDiagnosis, setIsEditingDiagnosis] = useState(false);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  const [isEditingWorkNotes, setIsEditingWorkNotes] = useState(false);
  const [workPerformed, setWorkPerformed] = useState('');
  const [technicianNotes, setTechnicianNotes] = useState('');

  const [isEditingOdometer, setIsEditingOdometer] = useState(false);
  const [odometerIn, setOdometerIn] = useState('');
  const [odometerOut, setOdometerOut] = useState('');

  // Add Labor Line state
  const [isAddingLabor, setIsAddingLabor] = useState(false);
  const [newLaborDesc, setNewLaborDesc] = useState('');
  const [newLaborHours, setNewLaborHours] = useState('');
  const [newLaborNotes, setNewLaborNotes] = useState('');

  // Add Part Line state
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [newPartDesc, setNewPartDesc] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newPartQty, setNewPartQty] = useState('1');
  const [newPartNotes, setNewPartNotes] = useState('');

  const [error, setError] = useState<string | null>(null);

  if (!workOrder) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-artemis-950 text-slate-400 text-xs p-6 text-center">
        <ClipboardList className="w-8 h-8 text-slate-600 mb-2" />
        <h4 className="text-sm font-bold text-slate-200">Work Order Not Found</h4>
        <p className="text-slate-500 mt-1 max-w-sm">
          This work order may have been removed or does not exist.
        </p>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: WorkOrderStatus) => {
    try {
      await updateWorkOrder(workOrder.id, { status: newStatus });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSaveConcern = async () => {
    if (!customerConcern.trim()) return;
    try {
      await updateWorkOrder(workOrder.id, { customerConcern: customerConcern.trim() });
      setIsEditingConcern(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSaveDiagnosis = async () => {
    try {
      await updateWorkOrder(workOrder.id, {
        inspectionNotes: inspectionNotes.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
      });
      setIsEditingDiagnosis(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSaveWorkNotes = async () => {
    try {
      await updateWorkOrder(workOrder.id, {
        workPerformed: workPerformed.trim() || undefined,
        technicianNotes: technicianNotes.trim() || undefined,
      });
      setIsEditingWorkNotes(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSaveOdometer = async () => {
    let pIn: number | undefined = undefined;
    let pOut: number | undefined = undefined;
    if (odometerIn.trim()) pIn = parseInt(odometerIn, 10);
    if (odometerOut.trim()) pOut = parseInt(odometerOut, 10);

    if (pIn !== undefined && pOut !== undefined && pOut < pIn) {
      setError('Odometer Out cannot be less than Odometer In');
      return;
    }

    try {
      await updateWorkOrder(workOrder.id, {
        odometerIn: pIn,
        odometerOut: pOut,
      });
      setIsEditingOdometer(false);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleAddLaborLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLaborDesc.trim()) return;

    const hours = newLaborHours.trim() ? parseFloat(newLaborHours) : undefined;
    if (hours !== undefined && (isNaN(hours) || hours < 0)) {
      setError('Labor hours cannot be negative');
      return;
    }

    const updatedLines: WorkOrderLaborLine[] = [
      ...workOrder.laborLines,
      {
        id: '', // Will be assigned by Main
        description: newLaborDesc.trim(),
        hours,
        notes: newLaborNotes.trim() || undefined,
      },
    ];

    try {
      await updateWorkOrder(workOrder.id, { laborLines: updatedLines });
      setNewLaborDesc('');
      setNewLaborHours('');
      setNewLaborNotes('');
      setIsAddingLabor(false);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteLaborLine = async (lineId: string) => {
    const updatedLines = workOrder.laborLines.filter((l) => l.id !== lineId);
    await updateWorkOrder(workOrder.id, { laborLines: updatedLines });
  };

  const handleAddPartLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartDesc.trim()) return;

    const qty = parseInt(newPartQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Part quantity must be greater than zero');
      return;
    }

    const updatedLines: WorkOrderPartLine[] = [
      ...workOrder.partLines,
      {
        id: '', // Will be assigned by Main
        description: newPartDesc.trim(),
        partNumber: newPartNumber.trim() || undefined,
        quantity: qty,
        notes: newPartNotes.trim() || undefined,
      },
    ];

    try {
      await updateWorkOrder(workOrder.id, { partLines: updatedLines });
      setNewPartDesc('');
      setNewPartNumber('');
      setNewPartQty('1');
      setNewPartNotes('');
      setIsAddingPart(false);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeletePartLine = async (lineId: string) => {
    const updatedLines = workOrder.partLines.filter((p) => p.id !== lineId);
    await updateWorkOrder(workOrder.id, { partLines: updatedLines });
  };

  const handleDeleteWO = async () => {
    if (window.confirm(`Are you sure you want to archive Work Order ${workOrder.workOrderNumber}?`)) {
      await deleteWorkOrder(workOrder.id);
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

  const totalLaborHours = workOrder.laborLines.reduce((acc, l) => acc + (l.hours || 0), 0);
  const totalPartQuantity = workOrder.partLines.reduce((acc, p) => acc + p.quantity, 0);

  const statusStyle = STATUS_CONFIG[workOrder.status] || STATUS_CONFIG.open;

  return (
    <div className="h-full w-full bg-artemis-950 flex flex-col overflow-hidden text-slate-100 select-none">
      {/* Top Header Bar */}
      <div className="h-14 bg-artemis-950 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-mono text-slate-100">
                {workOrder.workOrderNumber}
              </h2>
              <span className="text-xs text-slate-400 font-semibold truncate">
                — {workOrder.vehicleDescriptionSnapshot}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 font-mono">
              <span>Opened: {formatDate(workOrder.openedAt)}</span>
              {workOrder.completedAt && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400">Completed: {formatDate(workOrder.completedAt)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status Dropdown & Actions */}
        <div className="flex items-center gap-3">
          {/* Schedule Appointment Button */}
          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            + Schedule Appointment
          </button>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Status:</span>
            <select
              value={workOrder.status}
              onChange={(e) => handleStatusChange(e.target.value as WorkOrderStatus)}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer focus:outline-none',
                statusStyle.bg,
                statusStyle.text,
                statusStyle.border
              )}
            >
              <option value="open">Open</option>
              <option value="diagnosing">Diagnosing</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="waiting_parts">Waiting on Parts</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleDeleteWO}
            title="Archive Work Order"
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl w-full mx-auto">
        {/* Three Context Cards: Customer, Vehicle, Odometer */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Card */}
          <div className="p-4 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-artemis-accent" />
              Customer at Intake
            </span>
            {liveCustomer ? (
              <div
                onClick={() => openCustomerTab(liveCustomer.id, liveCustomer.name)}
                className="p-2.5 rounded-lg bg-artemis-950/80 border border-slate-800 hover:border-artemis-accent/40 cursor-pointer group transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-100 group-hover:text-artemis-accent transition-colors">
                    {liveCustomer.name}
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-artemis-accent transition-colors" />
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  {liveCustomer.customerNumber} • {liveCustomer.phone || 'No phone'}
                </div>
              </div>
            ) : workOrder.customerNameSnapshot ? (
              <div className="p-2.5 rounded-lg bg-artemis-950/60 border border-slate-800/80">
                <span className="font-bold text-xs text-slate-200 block">
                  {workOrder.customerNameSnapshot}
                </span>
                <span className="text-[10px] text-amber-400/80 italic font-mono">
                  (Historical Snapshot)
                </span>
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic p-2">Unassigned Walk-in</div>
            )}
          </div>

          {/* Vehicle Card */}
          <div className="p-4 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-artemis-accent" />
              Vehicle
            </span>
            {liveVehicle ? (
              <div
                onClick={() =>
                  openVehicleTab(
                    liveVehicle.id,
                    `${liveVehicle.year ? `${liveVehicle.year} ` : ''}${liveVehicle.make} ${liveVehicle.model}`
                  )
                }
                className="p-2.5 rounded-lg bg-artemis-950/80 border border-slate-800 hover:border-artemis-accent/40 cursor-pointer group transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-100 group-hover:text-artemis-accent transition-colors">
                    {workOrder.vehicleDescriptionSnapshot}
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-artemis-accent transition-colors" />
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  {liveVehicle.vehicleNumber} {liveVehicle.vin ? `• VIN: ${liveVehicle.vin}` : ''}
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-artemis-950/60 border border-slate-800/80">
                <span className="font-bold text-xs text-slate-200 block">
                  {workOrder.vehicleDescriptionSnapshot}
                </span>
                {workOrder.vinSnapshot && (
                  <span className="text-[10px] text-slate-400 font-mono block">
                    VIN: {workOrder.vinSnapshot}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Odometer Card */}
          <div className="p-4 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-artemis-accent" />
                Odometer Tracking
              </span>
              {!isEditingOdometer ? (
                <button
                  type="button"
                  onClick={() => {
                    setOdometerIn(workOrder.odometerIn?.toString() || '');
                    setOdometerOut(workOrder.odometerOut?.toString() || '');
                    setIsEditingOdometer(true);
                  }}
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                  Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveOdometer}
                  className="text-[10px] text-emerald-400 hover:underline font-bold flex items-center gap-1"
                >
                  <Check className="w-2.5 h-2.5" />
                  Save
                </button>
              )}
            </div>

            {isEditingOdometer ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500">In (mi)</label>
                  <input
                    type="number"
                    value={odometerIn}
                    onChange={(e) => setOdometerIn(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Out (mi)</label>
                  <input
                    type="number"
                    value={odometerOut}
                    onChange={(e) => setOdometerOut(e.target.value)}
                    className="w-full bg-artemis-950 border border-slate-700 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-artemis-950/60 border border-slate-800">
                  <span className="text-[9px] uppercase text-slate-500 block">In</span>
                  <span className="font-bold text-slate-200">
                    {workOrder.odometerIn !== undefined
                      ? `${workOrder.odometerIn.toLocaleString()} mi`
                      : '—'}
                  </span>
                </div>
                <div className="p-2 rounded bg-artemis-950/60 border border-slate-800">
                  <span className="text-[9px] uppercase text-slate-500 block">Out</span>
                  <span className="font-bold text-cyan-400">
                    {workOrder.odometerOut !== undefined
                      ? `${workOrder.odometerOut.toLocaleString()} mi`
                      : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customer Concern */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-artemis-accent" />
              Customer Concern / Stated Reason for Service
            </h3>
            {!isEditingConcern ? (
              <button
                type="button"
                onClick={() => {
                  setCustomerConcern(workOrder.customerConcern);
                  setIsEditingConcern(true);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveConcern}
                  className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingConcern(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {isEditingConcern ? (
            <textarea
              rows={3}
              value={customerConcern}
              onChange={(e) => setCustomerConcern(e.target.value)}
              className="w-full bg-artemis-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 resize-none"
            />
          ) : (
            <p className="text-xs text-slate-200 leading-relaxed font-medium bg-artemis-950/40 p-3 rounded-lg border border-slate-800/80">
              {workOrder.customerConcern}
            </p>
          )}
        </div>

        {/* Inspection & Diagnosis */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              Inspection & Diagnostic Findings
            </h3>
            {!isEditingDiagnosis ? (
              <button
                type="button"
                onClick={() => {
                  setInspectionNotes(workOrder.inspectionNotes || '');
                  setDiagnosis(workOrder.diagnosis || '');
                  setIsEditingDiagnosis(true);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDiagnosis}
                  className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingDiagnosis(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {isEditingDiagnosis ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Inspection Notes</label>
                <textarea
                  rows={2}
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  className="w-full bg-artemis-950 border border-slate-700 rounded-lg p-2 text-slate-200 resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Diagnostic Root Cause</label>
                <textarea
                  rows={2}
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full bg-artemis-950 border border-slate-700 rounded-lg p-2 text-slate-200 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-artemis-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Inspection Notes
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {workOrder.inspectionNotes || 'No inspection notes entered.'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-artemis-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-purple-400 block mb-1">
                  Diagnosis
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {workOrder.diagnosis || 'No diagnostic findings entered.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Labor Lines */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-cyan-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Labor Operations ({workOrder.laborLines.length})
              </h3>
              <span className="text-[11px] font-mono font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                {totalLaborHours.toFixed(1)} hrs total
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingLabor(true)}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Labor
            </button>
          </div>

          {isAddingLabor && (
            <form
              onSubmit={handleAddLaborLine}
              className="p-3 bg-artemis-950 rounded-xl border border-cyan-500/30 space-y-2 text-xs"
            >
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-3">
                  <input
                    type="text"
                    placeholder="Labor Operation Description (e.g. Replace front brake pads & bleed lines)"
                    value={newLaborDesc}
                    onChange={(e) => setNewLaborDesc(e.target.value)}
                    autoFocus
                    className="w-full bg-artemis-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 placeholder-slate-500"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Hours (e.g. 1.5)"
                    value={newLaborHours}
                    onChange={(e) => setNewLaborHours(e.target.value)}
                    className="w-full bg-artemis-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                  />
                </div>
              </div>
              <input
                type="text"
                placeholder="Optional labor notes / instructions..."
                value={newLaborNotes}
                onChange={(e) => setNewLaborNotes(e.target.value)}
                className="w-full bg-artemis-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 placeholder-slate-600 text-[11px]"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingLabor(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newLaborDesc.trim()}
                  className="px-3 py-1 rounded bg-cyan-500 text-slate-950 text-xs font-bold"
                >
                  Add Operation
                </button>
              </div>
            </form>
          )}

          {workOrder.laborLines.length === 0 && !isAddingLabor ? (
            <div className="p-4 text-center text-slate-500 text-xs italic bg-artemis-950/40 rounded-lg border border-slate-800/60">
              No labor operations recorded yet.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-artemis-950/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-artemis-950 text-slate-500">
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Hours</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrder.laborLines.map((line) => (
                    <tr key={line.id} className="border-b border-slate-800/60">
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-200 block">{line.description}</span>
                        {line.notes && (
                          <span className="text-[10px] text-slate-500">{line.notes}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-cyan-400 font-bold">
                        {line.hours !== undefined ? `${line.hours.toFixed(1)} hrs` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteLaborLine(line.id)}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Parts Lines */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Parts & Materials ({workOrder.partLines.length})
              </h3>
              <span className="text-[11px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-950 border border-amber-800">
                {totalPartQuantity} {totalPartQuantity === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingPart(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Part
            </button>
          </div>

          {isAddingPart && (
            <form
              onSubmit={handleAddPartLine}
              className="p-3 bg-artemis-950 rounded-xl border border-amber-500/30 space-y-2 text-xs"
            >
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Part Description (e.g. Ceramic Front Brake Pads)"
                    value={newPartDesc}
                    onChange={(e) => setNewPartDesc(e.target.value)}
                    autoFocus
                    className="w-full bg-artemis-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 placeholder-slate-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Part # (e.g. 004-420-91-20)"
                    value={newPartNumber}
                    onChange={(e) => setNewPartNumber(e.target.value)}
                    className="w-full bg-artemis-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono text-[11px]"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={newPartQty}
                    onChange={(e) => setNewPartQty(e.target.value)}
                    className="w-full bg-artemis-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 font-mono"
                  />
                </div>
              </div>
              <input
                type="text"
                placeholder="Optional part notes / supplier / bin..."
                value={newPartNotes}
                onChange={(e) => setNewPartNotes(e.target.value)}
                className="w-full bg-artemis-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 placeholder-slate-600 text-[11px]"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingPart(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newPartDesc.trim()}
                  className="px-3 py-1 rounded bg-amber-500 text-slate-950 text-xs font-bold"
                >
                  Add Part Item
                </button>
              </div>
            </form>
          )}

          {workOrder.partLines.length === 0 && !isAddingPart ? (
            <div className="p-4 text-center text-slate-500 text-xs italic bg-artemis-950/40 rounded-lg border border-slate-800/60">
              No parts recorded for this repair.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-lg overflow-hidden bg-artemis-950/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-artemis-950 text-slate-500">
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Part #</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrder.partLines.map((part) => (
                    <tr key={part.id} className="border-b border-slate-800/60">
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-200 block">{part.description}</span>
                        {part.notes && (
                          <span className="text-[10px] text-slate-500">{part.notes}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                        {part.partNumber || '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-amber-400 font-bold">
                        {part.quantity}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeletePartLine(part.id)}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Work Performed & Technician Notes */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Work Performed & Technician Notes
            </h3>
            {!isEditingWorkNotes ? (
              <button
                type="button"
                onClick={() => {
                  setWorkPerformed(workOrder.workPerformed || '');
                  setTechnicianNotes(workOrder.technicianNotes || '');
                  setIsEditingWorkNotes(true);
                }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveWorkNotes}
                  className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingWorkNotes(false)}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {isEditingWorkNotes ? (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Work Performed Summary</label>
                <textarea
                  rows={3}
                  value={workPerformed}
                  onChange={(e) => setWorkPerformed(e.target.value)}
                  className="w-full bg-artemis-950 border border-slate-700 rounded-lg p-2 text-slate-200 resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1">Internal Technician Notes</label>
                <textarea
                  rows={2}
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  className="w-full bg-artemis-950 border border-slate-700 rounded-lg p-2 text-slate-200 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-artemis-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                  Work Performed
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {workOrder.workPerformed || 'No work performed summary entered.'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-artemis-950/60 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Technician Notes & Recommendations
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {workOrder.technicianNotes || 'No technician notes entered.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Linked Appointments */}
        <div className="p-5 rounded-xl bg-artemis-900/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              Scheduled Appointments ({woEvents.length})
            </h3>
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold"
            >
              <Plus className="w-3 h-3" />
              Book Appointment
            </button>
          </div>

          {woEvents.length === 0 ? (
            <p className="text-xs text-slate-500 italic bg-artemis-950/40 p-3 rounded-lg">
              No appointments linked to this Work Order.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {woEvents.map((ev) => (
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
      </div>

      {/* Schedule Appointment Modal */}
      <CreateEventModal
        isOpen={isScheduleModalOpen}
        initialWorkOrderId={workOrder.id}
        initialVehicleId={workOrder.vehicleId}
        initialCustomerId={workOrder.customerId || undefined}
        initialTitle={`Service: ${workOrder.workOrderNumber} — ${workOrder.vehicleDescriptionSnapshot}`}
        onClose={() => setIsScheduleModalOpen(false)}
        onSubmit={async (opts) => {
          const created = await createEvent(opts);
          openScheduleEventTab(created.id, `${created.eventNumber} — ${created.title}`);
        }}
      />
    </div>
  );
};
