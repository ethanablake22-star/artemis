import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Save,
  CheckCircle2,
  Clock,
  Printer,
  Trash2,
  Plus,
  AlertTriangle,
  Car,
  ClipboardList,
  Calculator,
  Ban,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import type {
  InvoiceLineItem,
  InvoiceStatus,
  InvoiceLineType,
  InvoiceDiscountType,
  UpdateInvoiceOptions,
} from '@shared/automotiveTypes';
import {
  formatCents,
  parseCurrencyStringToCents,
  formatMilliQuantity,
  parseQuantityToMilli,
  formatBpsToPercent,
  parsePercentToBps,
  calculateLineTotalCents,
  calculateEstimateTotals,
} from '@shared/currencyUtils';
import { useAutomotive } from '../../../../state/AutomotiveContext';
import { useTabs } from '../../../../state/TabContext';
import { VoidInvoiceModal } from './VoidInvoiceModal';

interface InvoiceDetailTabProps {
  invoiceId: string;
}

interface LocalInvoiceLine {
  id: string;
  type: InvoiceLineType;
  description: string;
  quantityStr: string;
  unitPriceStr: string;
  taxable: boolean;
  notes?: string;
  sourceEstimateLineItemId?: string;
}

export const InvoiceDetailTab: React.FC<InvoiceDetailTabProps> = ({ invoiceId }) => {
  const {
    getInvoiceById,
    updateInvoice,
    issueInvoice,
    voidInvoice,
    deleteInvoice,
  } = useAutomotive();
  const {
    openWorkOrderTab,
    openEstimateTab,
    openVehicleTab,
    openCustomerTab,
    closeTab,
    activeTabId,
    syncInvoiceTitle,
  } = useTabs();

  const invoice = getInvoiceById(invoiceId);

  // Local form state
  const [localLines, setLocalLines] = useState<LocalInvoiceLine[]>([]);
  const [discountType, setDiscountType] = useState<InvoiceDiscountType | 'none'>('none');
  const [discountValueStr, setDiscountValueStr] = useState<string>('0');
  const [taxRateStr, setTaxRateStr] = useState<string>('0');
  const [customerMessage, setCustomerMessage] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Sync tab title when invoice loads
  useEffect(() => {
    if (invoice) {
      syncInvoiceTitle(
        invoice.id,
        `${invoice.invoiceNumber} — ${invoice.customerNameSnapshot || invoice.vehicleDescriptionSnapshot}`
      );
    }
  }, [invoice, syncInvoiceTitle]);

  // Initialize form state from invoice
  useEffect(() => {
    if (invoice) {
      setLocalLines(
        (invoice.lineItems || []).map((item) => ({
          id: item.id,
          type: item.type,
          description: item.description,
          quantityStr: (item.quantityMilli / 1000).toString(),
          unitPriceStr: (item.unitPriceCents / 100).toFixed(2),
          taxable: item.taxable,
          notes: item.notes,
          sourceEstimateLineItemId: item.sourceEstimateLineItemId,
        }))
      );

      setDiscountType(invoice.discountType || 'none');
      if (invoice.discountType === 'fixed' && invoice.fixedDiscountCents !== undefined) {
        setDiscountValueStr((invoice.fixedDiscountCents / 100).toFixed(2));
      } else if (
        invoice.discountType === 'percent' &&
        invoice.discountPercentBps !== undefined
      ) {
        setDiscountValueStr((invoice.discountPercentBps / 100).toFixed(2));
      } else {
        setDiscountValueStr('0');
      }

      setTaxRateStr((invoice.taxRateBps / 100).toFixed(2));
      setCustomerMessage(invoice.customerMessage || '');
      setInternalNotes(invoice.internalNotes || '');
      setDueDate(invoice.dueDate || '');
    }
  }, [invoice]);

  const isDraft = invoice?.status === 'draft';
  const isIssued = invoice?.status === 'issued';
  const isVoid = invoice?.status === 'void';

  // Live preview totals calculation
  const previewTotals = useMemo(() => {
    if (!invoice) {
      return {
        subtotalCents: 0,
        discountTotalCents: 0,
        taxableSubtotalCents: 0,
        taxTotalCents: 0,
        totalCents: 0,
      };
    }

    if (!isDraft) {
      return {
        subtotalCents: invoice.subtotalCents,
        discountTotalCents: invoice.discountTotalCents,
        taxableSubtotalCents: invoice.taxableSubtotalCents,
        taxTotalCents: invoice.taxTotalCents,
        totalCents: invoice.totalCents,
      };
    }

    const compiledItems: InvoiceLineItem[] = localLines.map((l) => ({
      id: l.id,
      type: l.type,
      description: l.description,
      quantityMilli: parseQuantityToMilli(l.quantityStr),
      unitPriceCents: parseCurrencyStringToCents(l.unitPriceStr),
      taxable: l.taxable,
      notes: l.notes,
      sourceEstimateLineItemId: l.sourceEstimateLineItemId,
    }));

    const parsedTaxRateBps = parsePercentToBps(taxRateStr);
    let parsedFixedDiscountCents: number | undefined = undefined;
    let parsedDiscountPercentBps: number | undefined = undefined;

    if (discountType === 'fixed') {
      parsedFixedDiscountCents = parseCurrencyStringToCents(discountValueStr);
    } else if (discountType === 'percent') {
      parsedDiscountPercentBps = parsePercentToBps(discountValueStr);
    }

    return calculateEstimateTotals(
      compiledItems,
      parsedTaxRateBps,
      discountType === 'none' ? undefined : discountType,
      parsedFixedDiscountCents,
      parsedDiscountPercentBps
    );
  }, [invoice, isDraft, localLines, taxRateStr, discountType, discountValueStr]);

  const exceedsEstimateCap = Boolean(
    invoice && isDraft && previewTotals.totalCents > invoice.estimateTotalSnapshotCents
  );

  // Line item manipulation (Draft only)
  const handleAddLine = (type: InvoiceLineType = 'labor') => {
    if (!isDraft) return;
    const newLine: LocalInvoiceLine = {
      id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      description: '',
      quantityStr: '1',
      unitPriceStr: '0.00',
      taxable: type === 'part',
    };
    setLocalLines((prev) => [...prev, newLine]);
  };

  const handleUpdateLine = (id: string, field: keyof LocalInvoiceLine, value: any) => {
    if (!isDraft) return;
    setLocalLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === 'type') {
          if (value === 'labor') updated.taxable = false;
          else if (value === 'part') updated.taxable = true;
        }
        return updated;
      })
    );
  };

  const handleRemoveLine = (id: string) => {
    if (!isDraft) return;
    setLocalLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSave = async () => {
    if (!invoice || !isDraft) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const compiledItems = localLines.map((l) => ({
        id: l.id.startsWith('new-') ? undefined : l.id,
        type: l.type,
        description: l.description,
        quantityMilli: parseQuantityToMilli(l.quantityStr),
        unitPriceCents: parseCurrencyStringToCents(l.unitPriceStr),
        taxable: l.taxable,
        notes: l.notes,
        sourceEstimateLineItemId: l.sourceEstimateLineItemId,
      }));

      const parsedTaxRateBps = parsePercentToBps(taxRateStr);
      let parsedFixedDiscountCents: number | undefined = undefined;
      let parsedDiscountPercentBps: number | undefined = undefined;

      if (discountType === 'fixed') {
        parsedFixedDiscountCents = parseCurrencyStringToCents(discountValueStr);
      } else if (discountType === 'percent') {
        parsedDiscountPercentBps = parsePercentToBps(discountValueStr);
      }

      const updates: UpdateInvoiceOptions = {
        lineItems: compiledItems,
        discountType: discountType === 'none' ? undefined : discountType,
        fixedDiscountCents: parsedFixedDiscountCents,
        discountPercentBps: parsedDiscountPercentBps,
        taxRateBps: parsedTaxRateBps,
        customerMessage: customerMessage.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        dueDate: dueDate.trim() || undefined,
      };

      await updateInvoice(invoice.id, updates);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleIssue = async () => {
    if (!invoice || !isDraft) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await handleSave();
      await issueInvoice(invoice.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoid = async (reason: string) => {
    if (!invoice || !isIssued) return;
    setErrorMessage(null);
    try {
      await voidInvoice(invoice.id, reason);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!invoice || !isDraft) return;
    setErrorMessage(null);
    try {
      const success = await deleteInvoice(invoice.id);
      if (success) {
        closeTab(activeTabId);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  const handleExportPDF = async () => {
    if (!invoice) return;
    try {
      if (window.artemisAPI?.documents?.exportPDF) {
        const filename = `${invoice.invoiceNumber}-${(invoice.customerNameSnapshot || invoice.vehicleDescriptionSnapshot).replace(/\s+/g, '-')}`;
        await window.artemisAPI.documents.exportPDF(filename);
      } else {
        window.print();
      }
    } catch (err) {
      console.error('PDF export failed:', err);
      window.print();
    }
  };

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-950">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Invoice Not Found</h2>
        <p className="text-slate-400 text-sm mb-4">
          This invoice may have been deleted or does not exist.
        </p>
        <button
          onClick={() => closeTab(activeTabId)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
        >
          Close Tab
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Draft</span>
          </span>
        );
      case 'issued':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 flex items-center space-x-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Issued</span>
          </span>
        );
      case 'void':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950/60 text-rose-300 border border-rose-800/60 flex items-center space-x-1.5">
            <Ban className="w-3.5 h-3.5" />
            <span>Void</span>
          </span>
        );
    }
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-slate-950 text-slate-100 p-6 max-w-6xl mx-auto space-y-6 print:p-8 print:bg-white print:text-black print:max-w-none">
      {/* Top Banner / Breadcrumb & Status Toolbar (Hidden on Print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 print:hidden">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-white tracking-tight">
                {invoice.invoiceNumber}
              </h1>
              {getStatusBadge(invoice.status)}
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-1">
              <span>Created {new Date(invoice.createdAt).toLocaleDateString()}</span>
              {invoice.issuedAt && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400">
                    Issued {new Date(invoice.issuedAt).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          {saveSuccess && (
            <span className="text-xs font-medium text-emerald-400 flex items-center space-x-1 animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          {isDraft && (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Draft</span>
              </button>

              <button
                type="button"
                onClick={handleIssue}
                disabled={isSaving || exceedsEstimateCap || localLines.length === 0}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title={
                  exceedsEstimateCap
                    ? 'Invoice total cannot exceed source estimate'
                    : localLines.length === 0
                    ? 'Add at least one line item'
                    : 'Issue final invoice to customer'
                }
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Issue Invoice</span>
              </button>
            </>
          )}

          {isIssued && (
            <button
              type="button"
              onClick={() => setShowVoidModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-bold transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Void Invoice</span>
            </button>
          )}
        </div>
      </div>

      {/* Void Notice Banner */}
      {isVoid && (
        <div className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-4 flex items-start space-x-3 text-sm text-rose-200 print:border-red-600 print:bg-red-50 print:text-red-900">
          <Ban className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold uppercase tracking-wider text-xs text-rose-300 print:text-red-800">
              Invoice Voided on {invoice.voidedAt ? new Date(invoice.voidedAt).toLocaleDateString() : 'N/A'}
            </div>
            <div className="mt-1 text-xs">
              <span className="font-semibold">Reason:</span> {invoice.voidReason || 'No reason provided'}
            </div>
            <div className="text-[11px] text-rose-400/80 mt-1 print:hidden">
              This invoice is permanently cancelled for financial accounting purposes.
            </div>
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800 rounded-xl p-3.5 flex items-center space-x-2.5 text-xs text-rose-300 print:hidden">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Cap Warning in Draft Mode */}
      {exceedsEstimateCap && (
        <div className="bg-amber-950/30 border border-amber-800/60 rounded-xl p-4 flex items-start space-x-3 text-xs text-amber-300 print:hidden">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Total Exceeds Approved Estimate</p>
            <p className="mt-0.5 text-amber-300/80">
              The current invoice total ({formatCents(previewTotals.totalCents)}) exceeds the source
              approved Estimate ({invoice.estimateNumberSnapshot}) total of{' '}
              {formatCents(invoice.estimateTotalSnapshotCents)}. Artemis V0.0.9 requires an invoice to
              stay within approved estimate pricing before issuance.
            </p>
          </div>
        </div>
      )}

      {/* Printable Invoice Header (Clean styling for print & UI) */}
      <div className="relative bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-6 print:bg-white print:border-none print:p-0">
        {/* Watermark for Draft / Void in Print */}
        {isDraft && (
          <div className="hidden print:block absolute top-12 right-12 text-6xl font-black text-gray-300 opacity-40 uppercase -rotate-12 pointer-events-none select-none">
            DRAFT
          </div>
        )}
        {isVoid && (
          <div className="hidden print:block absolute top-12 right-12 text-6xl font-black text-red-300 opacity-40 uppercase -rotate-12 pointer-events-none select-none">
            VOID
          </div>
        )}

        {/* Invoice Metadata Header */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-800 print:border-gray-300">
          {/* Shop / Billing Left Column */}
          <div className="space-y-3">
            <div className="text-xl font-black tracking-wider uppercase text-white print:text-black">
              INVOICE
            </div>
            <div className="space-y-1 text-xs text-slate-400 print:text-gray-700">
              <div className="font-bold text-slate-200 print:text-black">
                Invoice Number: <span className="font-mono">{invoice.invoiceNumber}</span>
              </div>
              <div>
                Date Issued:{' '}
                {invoice.issuedAt
                  ? new Date(invoice.issuedAt).toLocaleDateString()
                  : 'Unissued (Draft)'}
              </div>
              <div className="flex items-center space-x-2">
                <span>Payment Due:</span>
                {isDraft ? (
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500 print:hidden"
                  />
                ) : null}
                <span className={isDraft ? 'hidden print:inline font-mono' : 'font-mono'}>
                  {dueDate || 'Due upon receipt'}
                </span>
              </div>
            </div>

            {/* Related Commercial / Technical Records (Clickable in UI, static on print) */}
            <div className="pt-2 flex flex-wrap gap-2 text-xs print:text-gray-700">
              <button
                type="button"
                onClick={() =>
                  invoice.workOrderId &&
                  openWorkOrderTab(invoice.workOrderId, invoice.workOrderNumberSnapshot)
                }
                disabled={!invoice.workOrderId}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 hover:border-slate-600 text-slate-300 transition-colors print:border-none print:p-0 print:bg-transparent"
              >
                <ClipboardList className="w-3.5 h-3.5 text-emerald-400 print:hidden" />
                <span>WO: {invoice.workOrderNumberSnapshot}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  openEstimateTab(invoice.estimateId, invoice.estimateNumberSnapshot)
                }
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800/80 border border-slate-700 hover:border-slate-600 text-slate-300 transition-colors print:border-none print:p-0 print:bg-transparent"
              >
                <Calculator className="w-3.5 h-3.5 text-teal-400 print:hidden" />
                <span>Est: {invoice.estimateNumberSnapshot}</span>
              </button>
            </div>
          </div>

          {/* Customer & Vehicle Snapshot Right Column */}
          <div className="space-y-4 text-xs">
            {/* Customer Snapshot */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5 space-y-1.5 print:bg-transparent print:border-none print:p-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-500 flex items-center justify-between">
                <span>Billed To</span>
                {invoice.customerId && (
                  <button
                    type="button"
                    onClick={() =>
                      invoice.customerId &&
                      openCustomerTab(invoice.customerId, invoice.customerNameSnapshot || 'Customer')
                    }
                    className="text-amber-400 hover:underline text-[10px] print:hidden"
                  >
                    View Customer Profile
                  </button>
                )}
              </div>
              <div className="text-sm font-bold text-slate-100 print:text-black">
                {invoice.customerNameSnapshot || 'Valued Customer'}
              </div>
              {invoice.customerAddressSnapshot && (
                <div className="flex items-center space-x-1.5 text-slate-300 print:text-gray-700">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 print:hidden" />
                  <span>{invoice.customerAddressSnapshot}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 print:text-gray-700 pt-0.5">
                {invoice.customerPhoneSnapshot && (
                  <div className="flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-slate-500 print:hidden" />
                    <span>{invoice.customerPhoneSnapshot}</span>
                  </div>
                )}
                {invoice.customerEmailSnapshot && (
                  <div className="flex items-center space-x-1">
                    <Mail className="w-3 h-3 text-slate-500 print:hidden" />
                    <span>{invoice.customerEmailSnapshot}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Snapshot */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5 space-y-1 print:bg-transparent print:border-none print:p-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 print:text-gray-500 flex items-center justify-between">
                <span>Vehicle Service Record</span>
                {invoice.vehicleId && (
                  <button
                    type="button"
                    onClick={() =>
                      invoice.vehicleId &&
                      openVehicleTab(invoice.vehicleId, invoice.vehicleDescriptionSnapshot)
                    }
                    className="text-amber-400 hover:underline text-[10px] print:hidden"
                  >
                    View Vehicle Record
                  </button>
                )}
              </div>
              <div className="text-xs font-semibold text-slate-200 print:text-black flex items-center space-x-2">
                <Car className="w-3.5 h-3.5 text-indigo-400 print:hidden" />
                <span>{invoice.vehicleDescriptionSnapshot}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider print:text-black">
              Line Items
            </h3>
            {isDraft && (
              <div className="flex items-center space-x-2 print:hidden">
                <button
                  type="button"
                  onClick={() => handleAddLine('labor')}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Labor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddLine('part')}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Part</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddLine('fee')}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Fee</span>
                </button>
              </div>
            )}
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden print:border-gray-300">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] print:bg-gray-100 print:text-gray-700 print:border-gray-300">
                  <th className="py-2.5 px-3 w-16">Type</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 w-20 text-right">Qty</th>
                  <th className="py-2.5 px-3 w-28 text-right">Unit Price</th>
                  <th className="py-2.5 px-3 w-16 text-center">Tax</th>
                  <th className="py-2.5 px-3 w-28 text-right">Amount</th>
                  {isDraft && <th className="py-2.5 px-2 w-10 print:hidden"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
                {localLines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isDraft ? 7 : 6}
                      className="py-8 text-center text-slate-500 print:text-gray-400"
                    >
                      No line items on this invoice.
                    </td>
                  </tr>
                ) : (
                  localLines.map((line) => {
                    const qMilli = parseQuantityToMilli(line.quantityStr);
                    const pCents = parseCurrencyStringToCents(line.unitPriceStr);
                    const lineTotalCents = calculateLineTotalCents(qMilli, pCents);

                    return (
                      <tr
                        key={line.id}
                        className="hover:bg-slate-900/40 transition-colors print:hover:bg-transparent"
                      >
                        {/* Type */}
                        <td className="py-2.5 px-3">
                          {isDraft ? (
                            <select
                              value={line.type}
                              onChange={(e) =>
                                handleUpdateLine(
                                  line.id,
                                  'type',
                                  e.target.value as InvoiceLineType
                                )
                              }
                              className="bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                            >
                              <option value="labor">Labor</option>
                              <option value="part">Part</option>
                              <option value="fee">Fee</option>
                              <option value="sublet">Sublet</option>
                            </select>
                          ) : (
                            <span className="capitalize font-medium text-slate-300 print:text-gray-700">
                              {line.type}
                            </span>
                          )}
                        </td>

                        {/* Description & Notes */}
                        <td className="py-2.5 px-3 space-y-1">
                          {isDraft ? (
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) =>
                                handleUpdateLine(line.id, 'description', e.target.value)
                              }
                              placeholder="Line item description..."
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                            />
                          ) : (
                            <div className="font-medium text-slate-100 print:text-black">
                              {line.description}
                            </div>
                          )}
                          {line.notes && (
                            <div className="text-[11px] text-slate-400 print:text-gray-500 italic">
                              {line.notes}
                            </div>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-3 text-right font-mono">
                          {isDraft ? (
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={line.quantityStr}
                              onChange={(e) =>
                                handleUpdateLine(line.id, 'quantityStr', e.target.value)
                              }
                              className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-right text-white font-mono focus:outline-none focus:border-amber-500"
                            />
                          ) : (
                            formatMilliQuantity(qMilli)
                          )}
                        </td>

                        {/* Unit Price */}
                        <td className="py-2.5 px-3 text-right font-mono">
                          {isDraft ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={line.unitPriceStr}
                              onChange={(e) =>
                                handleUpdateLine(line.id, 'unitPriceStr', e.target.value)
                              }
                              className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-right text-white font-mono focus:outline-none focus:border-amber-500"
                            />
                          ) : (
                            formatCents(pCents)
                          )}
                        </td>

                        {/* Taxable checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          {isDraft ? (
                            <input
                              type="checkbox"
                              checked={line.taxable}
                              onChange={(e) =>
                                handleUpdateLine(line.id, 'taxable', e.target.checked)
                              }
                              className="rounded border-slate-700 text-amber-500 focus:ring-0 focus:outline-none cursor-pointer"
                            />
                          ) : line.taxable ? (
                            <span className="text-slate-300 print:text-gray-700 font-bold">✓</span>
                          ) : (
                            <span className="text-slate-600 print:text-gray-400">—</span>
                          )}
                        </td>

                        {/* Line Total */}
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-100 print:text-black">
                          {formatCents(lineTotalCents)}
                        </td>

                        {/* Remove Action */}
                        {isDraft && (
                          <td className="py-2.5 px-2 text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pricing, Discounts & Authoritative Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800 print:border-gray-300">
          {/* Notes and Customer Message Column */}
          <div className="space-y-4 text-xs">
            {/* Customer Message (Printed) */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-300 uppercase tracking-wider text-[11px] print:text-black">
                Customer Message / Terms
              </label>
              {isDraft ? (
                <textarea
                  rows={2}
                  value={customerMessage}
                  onChange={(e) => setCustomerMessage(e.target.value)}
                  placeholder="Payment terms, warranty info, or customer message..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              ) : (
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3 text-slate-300 print:bg-transparent print:border-none print:p-0 print:text-gray-700 whitespace-pre-wrap">
                  {customerMessage || 'Thank you for your business.'}
                </div>
              )}
            </div>

            {/* Internal Notes (Hidden on Print) */}
            <div className="space-y-1.5 print:hidden">
              <label className="block font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                Internal Notes (Private)
              </label>
              {isDraft ? (
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Internal notes, technician accounting notes..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              ) : (
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-3 text-slate-400 text-xs italic">
                  {internalNotes || 'No internal notes.'}
                </div>
              )}
            </div>
          </div>

          {/* Totals Summary Column */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3.5 print:bg-transparent print:border-none print:p-0">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider print:text-black">
              Payment Summary
            </h4>

            <div className="space-y-2.5 text-xs">
              {/* Subtotal */}
              <div className="flex justify-between items-center text-slate-300 print:text-black">
                <span>Subtotal</span>
                <span className="font-mono font-semibold">
                  {formatCents(previewTotals.subtotalCents)}
                </span>
              </div>

              {/* Discount Controls / Display */}
              <div className="pt-2 border-t border-slate-800/60 print:border-gray-200">
                {isDraft ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Discount Type</span>
                      <select
                        value={discountType}
                        onChange={(e) =>
                          setDiscountType(e.target.value as InvoiceDiscountType | 'none')
                        }
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="none">None</option>
                        <option value="fixed">Fixed ($)</option>
                        <option value="percent">Percentage (%)</option>
                      </select>
                    </div>

                    {discountType !== 'none' && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">
                          {discountType === 'fixed' ? 'Discount Amount ($)' : 'Discount Rate (%)'}
                        </span>
                        <input
                          type="number"
                          step={discountType === 'fixed' ? '0.01' : '0.1'}
                          min="0"
                          value={discountValueStr}
                          onChange={(e) => setDiscountValueStr(e.target.value)}
                          className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-right text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>
                ) : null}

                {previewTotals.discountTotalCents > 0 && (
                  <div className="flex justify-between items-center text-emerald-400 print:text-emerald-700 pt-1">
                    <span>
                      Discount{' '}
                      {discountType === 'percent' &&
                        `(${formatBpsToPercent(parsePercentToBps(discountValueStr))})`}
                    </span>
                    <span className="font-mono font-semibold">
                      -{formatCents(previewTotals.discountTotalCents)}
                    </span>
                  </div>
                )}
              </div>

              {/* Taxable Subtotal */}
              <div className="flex justify-between items-center text-slate-400 print:text-gray-600 pt-1 border-t border-slate-800/60 print:border-gray-200">
                <span>Taxable Subtotal</span>
                <span className="font-mono">{formatCents(previewTotals.taxableSubtotalCents)}</span>
              </div>

              {/* Tax Rate & Tax Total */}
              <div className="flex justify-between items-center text-slate-300 print:text-black">
                <div className="flex items-center space-x-1.5">
                  <span>Sales Tax</span>
                  {isDraft ? (
                    <div className="flex items-center space-x-1 print:hidden">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={taxRateStr}
                        onChange={(e) => setTaxRateStr(e.target.value)}
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-right text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                      <span>%</span>
                    </div>
                  ) : (
                    <span>({(invoice.taxRateBps / 100).toFixed(2)}%)</span>
                  )}
                </div>
                <span className="font-mono font-semibold">
                  {formatCents(previewTotals.taxTotalCents)}
                </span>
              </div>

              {/* Final Total */}
              <div className="pt-3 border-t-2 border-slate-700 print:border-black flex justify-between items-center">
                <span className="text-sm font-black uppercase text-white print:text-black">
                  Total Due
                </span>
                <span className="text-xl font-black text-amber-400 font-mono print:text-black">
                  {formatCents(previewTotals.totalCents)}
                </span>
              </div>
            </div>

            {/* Source Estimate Reference Badge */}
            <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between print:hidden">
              <span>Source Approved Estimate:</span>
              <span className="font-mono font-semibold text-slate-300">
                {formatCents(invoice.estimateTotalSnapshotCents)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions (Delete Draft) */}
        {isDraft && (
          <div className="pt-4 border-t border-slate-800 flex justify-between items-center print:hidden">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Draft Invoice</span>
            </button>
          </div>
        )}
      </div>

      {/* Void Modal */}
      <VoidInvoiceModal
        isOpen={showVoidModal}
        invoiceNumber={invoice.invoiceNumber}
        onClose={() => setShowVoidModal(false)}
        onConfirm={handleVoid}
      />

      {/* Delete Draft Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Delete Draft Invoice?</h3>
            </div>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete draft invoice{' '}
              <strong>{invoice.invoiceNumber}</strong>? This draft has not been issued to the
              customer.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-rose-950/40 transition-colors"
              >
                Delete Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
