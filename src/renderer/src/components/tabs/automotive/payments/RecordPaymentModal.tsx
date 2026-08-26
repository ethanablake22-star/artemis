import React, { useState, useEffect, useId } from 'react';
import { CreditCard, DollarSign, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import type {
  InvoiceRecord,
  InvoicePaymentSummary,
  CreatePaymentOptions,
  PaymentMethod,
  PaymentRecord,
} from '@shared/automotiveTypes';
import { formatCents, parseCurrencyStringToCents } from '@shared/currencyUtils';

interface RecordPaymentModalProps {
  isOpen: boolean;
  invoice: InvoiceRecord;
  summary: InvoicePaymentSummary;
  onClose: () => void;
  onRecordPayment: (options: CreatePaymentOptions) => Promise<PaymentRecord>;
  onPaymentSuccess?: (payment: PaymentRecord) => void;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'card', label: 'Credit / Debit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'bank_transfer', label: 'Bank Transfer (ACH / Wire)' },
  { value: 'digital_wallet', label: 'Digital Wallet (Apple Pay / Google Pay)' },
  { value: 'financing', label: 'Financing / Third-Party Lender' },
  { value: 'other', label: 'Other / Custom' },
];

function getLocalDateTimeInputValue(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  invoice,
  summary,
  onClose,
  onRecordPayment,
  onPaymentSuccess,
}) => {
  const amountInputId = useId();
  const methodInputId = useId();
  const receivedAtInputId = useId();
  const referenceInputId = useId();
  const notesInputId = useId();

  const [amountStr, setAmountStr] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [receivedAtStr, setReceivedAtStr] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Default amount to current balance due in dollars
      const defaultDollars = (summary.balanceDueCents / 100).toFixed(2);
      setAmountStr(defaultDollars);
      setMethod('card');
      setReceivedAtStr(getLocalDateTimeInputValue());
      setReference('');
      setNotes('');
      setError(null);
    }
  }, [isOpen, summary.balanceDueCents]);

  if (!isOpen) return null;

  let enteredCents = 0;
  try {
    enteredCents = parseCurrencyStringToCents(amountStr);
  } catch {
    enteredCents = 0;
  }
  const isOverpayment = enteredCents > summary.balanceDueCents;
  const isZeroOrNegative = enteredCents <= 0;
  const remainingAfterPaymentCents = Math.max(0, summary.balanceDueCents - enteredCents);

  const handlePayFull = () => {
    setAmountStr((summary.balanceDueCents / 100).toFixed(2));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isZeroOrNegative) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    if (isOverpayment) {
      setError(
        `Payment amount of ${formatCents(enteredCents)} exceeds remaining balance due of ${formatCents(summary.balanceDueCents)}. Overpayments are not supported.`
      );
      return;
    }

    let receivedAtEpoch = Date.now();
    if (receivedAtStr) {
      const parsedDate = new Date(receivedAtStr);
      if (!isNaN(parsedDate.getTime())) {
        receivedAtEpoch = parsedDate.getTime();
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payment = await onRecordPayment({
        invoiceId: invoice.id,
        amountCents: enteredCents,
        method,
        receivedAt: receivedAtEpoch,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      onPaymentSuccess?.(payment);
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
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center space-x-2 text-bronze-400">
            <CreditCard className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">Record Payment — {invoice.invoiceNumber}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Invoice financial status overview */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-3 grid grid-cols-3 gap-2 text-center">
            <div className="border-r border-zinc-800/80 pr-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Invoice Total</span>
              <p className="text-sm font-semibold text-white mt-0.5">{formatCents(summary.invoiceTotalCents)}</p>
            </div>
            <div className="border-r border-zinc-800/80 pr-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Paid to Date</span>
              <p className="text-sm font-semibold text-bronze-400 mt-0.5">{formatCents(summary.paidCents)}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400">Balance Due</span>
              <p className="text-sm font-bold text-bronze-400 mt-0.5">{formatCents(summary.balanceDueCents)}</p>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor={amountInputId} className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Payment Amount <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handlePayFull}
                className="text-xs text-bronze-400 hover:text-bronze-300 font-medium hover:underline"
              >
                Pay Full Balance ({formatCents(summary.balanceDueCents)})
              </button>
            </div>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -tranzinc-y-1/2" />
              <input
                id={amountInputId}
                type="text"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="0.00"
                className={`w-full bg-zinc-950 border rounded-lg pl-9 pr-3 py-2.5 text-base font-bold text-white placeholder-zinc-500 focus:outline-none transition-colors ${
                  isOverpayment
                    ? 'border-rose-500 text-rose-300 focus:border-rose-500'
                    : 'border-zinc-700 focus:border-bronze-500'
                }`}
                required
                autoFocus
              />
            </div>
            {isOverpayment && (
              <p className="text-xs text-rose-400 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Amount exceeds current balance due of {formatCents(summary.balanceDueCents)}.</span>
              </p>
            )}
            {!isOverpayment && enteredCents > 0 && (
              <p className="text-xs text-zinc-400 mt-1 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-bronze-400" />
                <span>
                  Remaining balance after payment: <strong className="text-zinc-200">{formatCents(remainingAfterPaymentCents)}</strong>
                </span>
              </p>
            )}
          </div>

          {/* Payment Method & Received Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={methodInputId} className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Payment Method <span className="text-rose-400">*</span>
              </label>
              <select
                id={methodInputId}
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze-500 transition-colors"
                required
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor={receivedAtInputId} className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Received Date / Time <span className="text-rose-400">*</span>
              </label>
              <input
                id={receivedAtInputId}
                type="datetime-local"
                value={receivedAtStr}
                onChange={(e) => setReceivedAtStr(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-bronze-500 transition-colors"
                required
              />
            </div>
          </div>

          {/* Reference */}
          <div>
            <label htmlFor={referenceInputId} className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Reference / Transaction ID <span className="text-zinc-500 font-normal">(Optional)</span>
            </label>
            <input
              id={referenceInputId}
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Check #1042, Auth #89201, Wire Ref, etc."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-bronze-500 transition-colors"
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label htmlFor={notesInputId} className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Shop Notes <span className="text-zinc-500 font-normal">(Optional - internal only)</span>
            </label>
            <textarea
              id={notesInputId}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Internal bookkeeping notes (not printed on customer receipt)..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-bronze-500 transition-colors"
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
              disabled={isSubmitting || isZeroOrNegative || isOverpayment}
              className="flex items-center space-x-1.5 px-4 py-2 bg-bronze-600 hover:bg-bronze-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-bronze-950/40 transition-colors disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : `Record Payment (${formatCents(enteredCents)})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
