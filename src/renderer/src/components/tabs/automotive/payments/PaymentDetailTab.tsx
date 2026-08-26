import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Printer,
  Ban,
  User,
  Car,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
} from 'lucide-react';
import type { InvoiceRecord } from '@shared/automotiveTypes';
import { useAutomotive } from '../../../../state/AutomotiveContext';
import { useTabs } from '../../../../state/TabContext';
import { formatCents } from '@shared/currencyUtils';
import { VoidPaymentModal } from './VoidPaymentModal';

interface PaymentDetailTabProps {
  paymentId: string;
}

const METHOD_LABELS: Record<string, string> = {
  card: 'Credit / Debit Card',
  cash: 'Cash',
  check: 'Check',
  bank_transfer: 'Bank Transfer (ACH / Wire)',
  digital_wallet: 'Digital Wallet (Apple Pay / Google Pay)',
  financing: 'Financing / Third-Party Lender',
  other: 'Other / Custom',
};

export const PaymentDetailTab: React.FC<PaymentDetailTabProps> = ({ paymentId }) => {
  const { getPaymentById, voidPayment, invoices } = useAutomotive();
  const { openInvoiceTab, openCustomerTab, syncPaymentTitle } = useTabs();

  const payment = getPaymentById(paymentId);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);

  // Sync tab title
  useEffect(() => {
    if (payment) {
      const title = `${payment.paymentNumber} — ${payment.invoiceNumberSnapshot}`;
      syncPaymentTitle(payment.id, title);
    }
  }, [payment, syncPaymentTitle]);

  if (!payment) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-zinc-400">
        <CreditCard className="w-12 h-12 mb-3 text-zinc-600 animate-pulse" />
        <h2 className="text-lg font-semibold text-zinc-200">Payment Record Not Found</h2>
        <p className="text-sm mt-1 text-zinc-500">The requested payment ID does not exist or has been removed.</p>
      </div>
    );
  }

  const isVoid = payment.status === 'void';
  const associatedInvoice = invoices.find((i: InvoiceRecord) => i.id === payment.invoiceId && !i.isDeleted);

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmVoid = async (reason: string) => {
    await voidPayment(payment.id, reason);
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-zinc-100 overflow-y-auto print:bg-white print:text-black">
      {/* Screen Toolbar / Header (Hidden when printing) */}
      <div className="shrink-0 bg-zinc-900/80 backdrop-blur border-b border-zinc-800 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl ${isVoid ? 'bg-rose-950/50 text-rose-400 border border-rose-800/60' : 'bg-bronze-950/50 text-bronze-400 border border-bronze-800/60'}`}>
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-xl font-bold text-white tracking-tight">{payment.paymentNumber}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isVoid
                    ? 'bg-rose-950/80 text-rose-400 border border-rose-800'
                    : 'bg-bronze-950/80 text-bronze-400 border border-bronze-800'
                }`}
              >
                {isVoid ? 'Void' : 'Posted'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Applied to Invoice <strong className="text-zinc-300">{payment.invoiceNumberSnapshot}</strong> • Received on{' '}
              {new Date(payment.receivedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg transition-colors border border-zinc-700 shadow-sm"
          >
            <Printer className="w-4 h-4 text-zinc-400" />
            <span>Print Receipt</span>
          </button>

          <button
            type="button"
            onClick={() =>
              openInvoiceTab(
                payment.invoiceId,
                `${payment.invoiceNumberSnapshot} — ${payment.customerNameSnapshot || 'Invoice'}`
              )
            }
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-silver-300 hover:text-silver-200 text-sm font-medium rounded-lg transition-colors border border-zinc-700 shadow-sm"
          >
            <Receipt className="w-4 h-4" />
            <span>Open Invoice</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </button>

          {!isVoid && (
            <button
              type="button"
              onClick={() => setIsVoidModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-white text-sm font-medium rounded-lg transition-colors border border-rose-800/80 shadow-sm"
            >
              <Ban className="w-4 h-4 text-rose-400" />
              <span>Void Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Screen Content */}
      <div className="p-4 sm:p-6 max-w-5xl w-full mx-auto space-y-6 print:p-0 print:max-w-none">
        {/* Void Audit Notice */}
        {isVoid && (
          <div className="bg-rose-950/30 border border-rose-800/80 rounded-xl p-4 flex items-start space-x-3 text-rose-200 print:border-red-600 print:bg-red-50 print:text-red-900">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-rose-300 print:text-red-900">This Payment Record is VOID</h3>
              <p className="text-xs text-rose-200/90 print:text-red-800">
                Voided on {payment.voidedAt ? new Date(payment.voidedAt).toLocaleString() : 'N/A'}. This payment amount ($0.00)
                does not count toward the customer balance.
              </p>
              {payment.voidReason && (
                <div className="mt-2 text-xs bg-rose-950/60 border border-rose-900/60 rounded-lg p-2 text-rose-200 print:bg-white print:border-red-400">
                  <span className="font-semibold">Reason:</span> {payment.voidReason}
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRINTABLE RECEIPT CONTAINER */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-xl print:shadow-none print:border-none print:p-0 print:bg-transparent">
          {/* Printable Header */}
          <div className="border-b border-zinc-800 print:border-black pb-6 mb-6 flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded bg-artemis-accent/20 flex items-center justify-center text-artemis-accent print:hidden font-black text-xs">
                  A
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white print:text-black">
                  ARTEMIS AUTOMOTIVE
                </h2>
              </div>
              <p className="text-xs text-zinc-400 print:text-gray-600 mt-1">Official Payment Receipt</p>
            </div>

            <div className="text-right">
              <p className="text-sm font-bold text-white print:text-black tracking-wide">{payment.paymentNumber}</p>
              <p className="text-xs text-zinc-400 print:text-gray-600">
                Date: {new Date(payment.receivedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Customer & Vehicle Snapshot Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-950/60 print:bg-gray-50 border border-zinc-800 print:border-gray-300 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-400 print:text-gray-700 uppercase tracking-wider mb-2">
                <User className="w-3.5 h-3.5 text-silver-400" />
                <span>Customer</span>
              </div>
              <p className="text-sm font-bold text-white print:text-black">
                {payment.customerNameSnapshot || 'Shop / Direct Walk-in'}
              </p>
              {associatedInvoice?.customerPhoneSnapshot && (
                <p className="text-xs text-zinc-400 print:text-gray-600 mt-0.5">
                  Phone: {associatedInvoice.customerPhoneSnapshot}
                </p>
              )}
              {associatedInvoice?.customerEmailSnapshot && (
                <p className="text-xs text-zinc-400 print:text-gray-600">
                  Email: {associatedInvoice.customerEmailSnapshot}
                </p>
              )}
              {payment.customerId && (
                <button
                  type="button"
                  onClick={() => openCustomerTab(payment.customerId!, payment.customerNameSnapshot || 'Customer')}
                  className="mt-2 text-xs text-silver-400 hover:text-silver-300 print:hidden flex items-center space-x-1"
                >
                  <span>Open Customer Record</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="bg-zinc-950/60 print:bg-gray-50 border border-zinc-800 print:border-gray-300 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-400 print:text-gray-700 uppercase tracking-wider mb-2">
                <Car className="w-3.5 h-3.5 text-silver-400" />
                <span>Vehicle & Invoice</span>
              </div>
              <p className="text-sm font-bold text-white print:text-black">{payment.vehicleDescriptionSnapshot}</p>
              <p className="text-xs text-zinc-400 print:text-gray-600 mt-0.5">
                Applied to Invoice: <strong className="text-zinc-300 print:text-black">{payment.invoiceNumberSnapshot}</strong>
              </p>
              <p className="text-xs text-zinc-400 print:text-gray-600">
                Invoice Total: {formatCents(payment.invoiceTotalSnapshotCents)}
              </p>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="border border-zinc-800 print:border-black rounded-lg overflow-hidden mb-6">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/80 print:bg-gray-100 text-xs uppercase font-semibold text-zinc-400 print:text-black border-b border-zinc-800 print:border-black">
                <tr>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 print:divide-gray-300">
                <tr>
                  <td className="py-3 px-4 text-zinc-300 print:text-black">
                    Invoice {payment.invoiceNumberSnapshot} — Billed Total
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-300 print:text-black">
                    {formatCents(payment.invoiceTotalSnapshotCents)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-zinc-400 print:text-gray-700">
                    Balance Prior to this Payment
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-400 print:text-gray-700">
                    {formatCents(payment.balanceBeforeCents)}
                  </td>
                </tr>
                <tr className={isVoid ? 'bg-rose-950/20 print:bg-red-50' : 'bg-bronze-950/20 print:bg-gray-50 font-bold'}>
                  <td className="py-3 px-4 flex items-center space-x-2">
                    <span className={isVoid ? 'text-rose-400 line-through' : 'text-bronze-400 print:text-black'}>
                      Payment Received ({METHOD_LABELS[payment.method] || payment.method})
                    </span>
                    {payment.reference && (
                      <span className="text-xs text-zinc-400 print:text-gray-600 font-normal">
                        • Ref: {payment.reference}
                      </span>
                    )}
                  </td>
                  <td className={`py-3 px-4 text-right ${isVoid ? 'text-rose-400 line-through' : 'text-bronze-400 print:text-black text-base'}`}>
                    {formatCents(payment.amountCents)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-zinc-200 print:text-black">
                    Remaining Balance Due
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-bronze-400 print:text-black">
                    {formatCents(payment.balanceAfterCents)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Method & Reference Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-950/60 print:bg-gray-50 border border-zinc-800 print:border-gray-300 rounded-lg p-3.5 text-xs">
            <div>
              <span className="text-zinc-400 print:text-gray-600 uppercase font-semibold">Payment Method</span>
              <p className="font-medium text-white print:text-black mt-0.5">
                {METHOD_LABELS[payment.method] || payment.method}
              </p>
            </div>
            <div>
              <span className="text-zinc-400 print:text-gray-600 uppercase font-semibold">Reference / Auth</span>
              <p className="font-medium text-white print:text-black mt-0.5">
                {payment.reference || 'None provided'}
              </p>
            </div>
            <div>
              <span className="text-zinc-400 print:text-gray-600 uppercase font-semibold">Recorded Date & Time</span>
              <p className="font-medium text-white print:text-black mt-0.5">
                {new Date(payment.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Internal Notes (Hidden when printing receipt) */}
          {payment.notes && (
            <div className="mt-4 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 print:hidden">
              <span className="font-semibold text-zinc-300 block mb-1">Internal Shop Notes (Not printed on receipt):</span>
              <p className="whitespace-pre-wrap">{payment.notes}</p>
            </div>
          )}

          {/* Print Footer */}
          <div className="mt-8 pt-4 border-t border-zinc-800 print:border-black text-center text-xs text-zinc-500 print:text-gray-600 hidden print:block">
            <p>Thank you for your business!</p>
            <p className="mt-0.5">Artemis Automotive Systems • Point of Sale Receipt</p>
          </div>
        </div>
      </div>

      {/* Void Modal */}
      <VoidPaymentModal
        isOpen={isVoidModalOpen}
        paymentNumber={payment.paymentNumber}
        amountFormatted={formatCents(payment.amountCents)}
        onClose={() => setIsVoidModalOpen(false)}
        onConfirm={handleConfirmVoid}
      />
    </div>
  );
};
