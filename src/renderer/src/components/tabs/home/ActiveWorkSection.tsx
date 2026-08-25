import React, { useState } from 'react';
import {
  Wrench,
  ArrowUpRight,
  Plus,
  Car,
  User,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useTabs } from '../../../state/TabContext';
import { CreateWorkOrderModal } from '../automotive/CreateWorkOrderModal';
import type { CreateWorkOrderOptions, WorkOrderStatus } from '@shared/automotiveTypes';
import clsx from 'clsx';

const STATUS_PRIORITY: Record<WorkOrderStatus, number> = {
  in_progress: 1,
  diagnosing: 2,
  awaiting_approval: 3,
  waiting_parts: 4,
  open: 5,
  draft: 6,
  completed: 99,
  cancelled: 99,
};

const STATUS_CONFIG: Record<WorkOrderStatus, { label: string; bg: string; text: string; border: string }> = {
  in_progress: { label: 'In Progress', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  diagnosing: { label: 'Diagnosing', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  awaiting_approval: { label: 'Awaiting Approval', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  waiting_parts: { label: 'Waiting on Parts', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  open: { label: 'Open', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  draft: { label: 'Draft', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  completed: { label: 'Completed', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
};

export const ActiveWorkSection: React.FC = () => {
  const { workOrders, vehicles, customers, createWorkOrder, error } = useAutomotive();
  const { openWorkOrderTab, openTab } = useTabs();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Active non-deleted work orders excluding completed and cancelled
  const activeOrders = workOrders
    .filter((w) => !w.isDeleted && w.status !== 'completed' && w.status !== 'cancelled')
    .sort((a, b) => {
      const pA = STATUS_PRIORITY[a.status] ?? 50;
      const pB = STATUS_PRIORITY[b.status] ?? 50;
      if (pA !== pB) return pA - pB;
      return b.openedAt - a.openedAt;
    });

  const displayOrders = activeOrders.slice(0, 6);

  const handleCreateWorkOrder = async (options: CreateWorkOrderOptions) => {
    const created = await createWorkOrder(options);
    setIsCreateModalOpen(false);
    openWorkOrderTab(created.id, created.workOrderNumber);
  };

  return (
    <div className="bg-artemis-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              Active Work Orders
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              {activeOrders.length} active {activeOrders.length === 1 ? 'repair job' : 'repair jobs'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Create New Work Order"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openTab({ id: 'automotive', type: 'automotive', title: 'Automotive', closable: true })}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-emerald-500/10"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="my-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to load active work: {error}</span>
        </div>
      )}

      {/* List */}
      <div className="mt-3 space-y-2.5 flex-1 overflow-y-auto min-h-[160px] pr-1">
        {displayOrders.length === 0 ? (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-slate-800">
            <ClipboardList className="w-6 h-6 text-slate-600 mb-1.5" />
            <div className="text-xs font-semibold text-slate-400">No active work orders</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Service jobs, inspections, and diagnostics will appear here.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New Work Order
            </button>
          </div>
        ) : (
          displayOrders.map((wo) => {
            const statusStyle = STATUS_CONFIG[wo.status] || STATUS_CONFIG.open;

            return (
              <div
                key={wo.id}
                onClick={() => openWorkOrderTab(wo.id, wo.workOrderNumber)}
                className="group p-3.5 rounded-xl bg-artemis-950/60 hover:bg-artemis-950 border border-slate-800/80 hover:border-emerald-500/30 transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-slate-100">
                      {wo.workOrderNumber}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">•</span>
                    <span
                      className={clsx(
                        'text-[9px] font-bold uppercase px-2 py-0.5 rounded border',
                        statusStyle.bg,
                        statusStyle.text,
                        statusStyle.border
                      )}
                    >
                      {statusStyle.label}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition-colors truncate flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{wo.vehicleDescriptionSnapshot}</span>
                  </h4>

                  {wo.customerConcern && (
                    <p className="text-[11px] text-slate-400 truncate mt-1">
                      {wo.customerConcern}
                    </p>
                  )}

                  <div className="mt-1.5 flex items-center gap-3 text-[10px] font-mono text-slate-500">
                    {wo.customerNameSnapshot && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-600" />
                        {wo.customerNameSnapshot}
                      </span>
                    )}
                    <span>Opened {new Date(wo.openedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
              </div>
            );
          })
        )}
      </div>

      {/* Reusable Create Work Order Modal */}
      <CreateWorkOrderModal
        isOpen={isCreateModalOpen}
        vehicles={vehicles}
        customers={customers}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateWorkOrder}
      />
    </div>
  );
};
