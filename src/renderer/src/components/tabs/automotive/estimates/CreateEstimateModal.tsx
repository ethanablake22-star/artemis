import React, { useState } from 'react';
import { X, Calculator, ArrowRight, AlertCircle } from 'lucide-react';
import type { WorkOrderRecord, CreateEstimateOptions } from '@shared/automotiveTypes';
import { parseCurrencyStringToCents, parsePercentToBps } from '@shared/currencyUtils';

interface CreateEstimateModalProps {
  workOrder: WorkOrderRecord;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (options: CreateEstimateOptions) => Promise<void>;
}

export const CreateEstimateModal: React.FC<CreateEstimateModalProps> = ({
  workOrder,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [importWorkOrderItems, setImportWorkOrderItems] = useState(true);
  const [laborRateStr, setLaborRateStr] = useState('95.00');
  const [taxRateStr, setTaxRateStr] = useState('0.00');
  const [notes, setNotes] = useState('');
  const [customerMessage, setCustomerMessage] = useState(
    'Thank you for choosing us for your vehicle service. Please review the estimated costs below.'
  );
  const [validUntilStr, setValidUntilStr] = useState(
    () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let defaultLaborRateCents = 0;
      if (importWorkOrderItems && laborRateStr.trim()) {
        try {
          defaultLaborRateCents = parseCurrencyStringToCents(laborRateStr.trim());
          if (defaultLaborRateCents < 0) {
            throw new Error('Labor rate cannot be negative');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Invalid labor rate');
          setIsSubmitting(false);
          return;
        }
      }

      let taxRateBps = 0;
      if (taxRateStr.trim()) {
        try {
          taxRateBps = parsePercentToBps(taxRateStr.trim());
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Invalid tax rate');
          setIsSubmitting(false);
          return;
        }
      }

      let validUntil: number | undefined;
      if (validUntilStr) {
        const parsed = new Date(validUntilStr).getTime();
        if (!isNaN(parsed)) {
          validUntil = parsed;
        }
      }

      const options: CreateEstimateOptions = {
        workOrderId: workOrder.id,
        importWorkOrderItems,
        defaultLaborRateCents,
        taxRateBps,
        notes: notes.trim() || undefined,
        customerMessage: customerMessage.trim() || undefined,
        validUntil,
      };

      await onSubmit(options);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Create Estimate</h2>
              <p className="text-xs text-slate-400">
                For {workOrder.workOrderNumber} · {workOrder.vehicleDescriptionSnapshot}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg flex items-center space-x-2 text-sm text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Import Work Order Items Option */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/70 rounded-lg space-y-3">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={importWorkOrderItems}
                onChange={(e) => setImportWorkOrderItems(e.target.checked)}
                className="mt-1 rounded bg-slate-900 border-slate-700 text-teal-600 focus:ring-teal-500 w-4 h-4"
              />
              <div>
                <span className="text-sm font-semibold text-white block">
                  Import Work Order Operations & Parts
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Copies {workOrder.laborLines.length} labor line(s) and{' '}
                  {workOrder.partLines.length} part item(s) from {workOrder.workOrderNumber} as
                  independent estimate proposal items.
                </span>
              </div>
            </label>

            {importWorkOrderItems && (
              <div className="pt-2 pl-7 border-t border-slate-700/50 flex items-center space-x-4">
                <label className="block text-xs text-slate-300">
                  <span className="block font-medium mb-1">Default Labor Rate ($/hr)</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs">$</span>
                    <input
                      type="text"
                      value={laborRateStr}
                      onChange={(e) => setLaborRateStr(e.target.value)}
                      placeholder="95.00"
                      className="w-32 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 pl-6 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </label>
                <div className="text-xs text-slate-400 self-end pb-1">
                  Applied across all imported labor hours.
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Initial Tax Rate (%)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={taxRateStr}
                  onChange={(e) => setTaxRateStr(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 pr-8"
                />
                <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-semibold">
                  %
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                E.g. 7.00 for 7%. Can be adjusted per estimate.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Valid Until Date
              </label>
              <input
                type="date"
                value={validUntilStr}
                onChange={(e) => setValidUntilStr(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Quote expiration date shown on proposal.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Customer Message / Disclaimer
            </label>
            <textarea
              rows={2}
              value={customerMessage}
              onChange={(e) => setCustomerMessage(e.target.value)}
              placeholder="Message shown to customer on PDF proposal..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Internal Shop Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal pricing assumptions, parts source notes..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-teal-900/30 transition-all disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Creating...' : 'Create Estimate'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
