import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  Car,
} from 'lucide-react';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useTabs } from '../../../state/TabContext';
import clsx from 'clsx';

export const NeedsAttentionSection: React.FC = () => {
  const { workOrders, error } = useAutomotive();
  const { openWorkOrderTab, openTab } = useTabs();

  // Active work orders that genuinely need attention
  const activeOrders = workOrders.filter((w) => !w.isDeleted);
  const awaitingApproval = activeOrders.filter((w) => w.status === 'awaiting_approval');
  const waitingParts = activeOrders.filter((w) => w.status === 'waiting_parts');
  const diagnosing = activeOrders.filter((w) => w.status === 'diagnosing');

  const attentionOrders = [...awaitingApproval, ...waitingParts, ...diagnosing];
  const totalAttentionCount = attentionOrders.length;

  return (
    <div className="bg-artemis-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
              Needs Attention
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              {totalAttentionCount} {totalAttentionCount === 1 ? 'action item' : 'action items'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openTab({ id: 'automotive', type: 'automotive', title: 'Automotive', closable: true })}
          className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-amber-500/10"
        >
          <span>Automotive Hub</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="my-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to load work orders: {error}</span>
        </div>
      )}

      {/* Metric Pills Summary */}
      <div className="grid grid-cols-3 gap-2.5 my-3 shrink-0">
        <div className="bg-artemis-950/80 border border-amber-500/20 rounded-xl p-2.5 text-center">
          <div className="text-lg font-extrabold font-mono text-amber-400">
            {awaitingApproval.length}
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
            Awaiting Approval
          </div>
        </div>

        <div className="bg-artemis-950/80 border border-orange-500/20 rounded-xl p-2.5 text-center">
          <div className="text-lg font-extrabold font-mono text-orange-400">
            {waitingParts.length}
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
            Waiting on Parts
          </div>
        </div>

        <div className="bg-artemis-950/80 border border-purple-500/20 rounded-xl p-2.5 text-center">
          <div className="text-lg font-extrabold font-mono text-purple-400">
            {diagnosing.length}
          </div>
          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
            Diagnosing
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2 flex-1 overflow-y-auto min-h-[140px] pr-1">
        {totalAttentionCount === 0 ? (
          <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-slate-800">
            <CheckCircle2 className="w-6 h-6 text-emerald-500/80 mb-1.5" />
            <div className="text-xs font-semibold text-slate-300">All Operations Flowing Cleanly</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              No Work Orders awaiting customer approval, diagnosis, or parts delivery.
            </p>
          </div>
        ) : (
          attentionOrders.slice(0, 5).map((wo) => {
            const isApproval = wo.status === 'awaiting_approval';
            const isParts = wo.status === 'waiting_parts';

            return (
              <div
                key={wo.id}
                onClick={() => openWorkOrderTab(wo.id, wo.workOrderNumber)}
                className="group p-3 rounded-xl bg-artemis-950/60 hover:bg-artemis-950 border border-slate-800/80 hover:border-amber-500/30 transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {wo.workOrderNumber}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">•</span>
                    <span
                      className={clsx(
                        'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border',
                        isApproval && 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                        isParts && 'bg-orange-500/10 text-orange-400 border-orange-500/30',
                        !isApproval && !isParts && 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      )}
                    >
                      {isApproval ? 'Approval Needed' : isParts ? 'Parts Pending' : 'In Diagnostic'}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-slate-300 group-hover:text-amber-300 transition-colors truncate flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{wo.vehicleDescriptionSnapshot}</span>
                  </h4>

                  {wo.customerConcern && (
                    <p className="text-[11px] text-slate-400 truncate mt-1">
                      {wo.customerConcern}
                    </p>
                  )}
                </div>

                <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors shrink-0" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
