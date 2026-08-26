import React, { useState } from 'react';
import { AlertTriangle, Ban, X } from 'lucide-react';

interface VoidPaymentModalProps {
  isOpen: boolean;
  paymentNumber: string;
  amountFormatted: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const VoidPaymentModal: React.FC<VoidPaymentModalProps> = ({
  isOpen,
  paymentNumber,
  amountFormatted,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('A reason is required to void this payment.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center space-x-2 text-rose-400">
            <Ban className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">
              Void Payment {paymentNumber} ({amountFormatted})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-rose-950/20 border border-rose-900/40 rounded-lg p-3 text-xs text-rose-300 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold">Audit Void Action</p>
              <p className="mt-0.5 text-rose-300/80">
                Voiding permanently cancels this payment record and restores the invoice balance due.
                The payment number ({paymentNumber}) is preserved for audit trails and will not be reused.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Reason for Voiding <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              rows={3}
              placeholder="e.g., Check bounced, duplicate payment entry, incorrect payment method selected..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-900/50 p-2.5 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-rose-950/40 transition-colors disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              <span>{isSubmitting ? 'Voiding...' : 'Confirm Void'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
