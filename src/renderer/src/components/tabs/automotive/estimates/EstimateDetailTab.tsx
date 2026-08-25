import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  FileDown,
  Trash2,
  Plus,
  AlertTriangle,
  Car,
  User,
  ClipboardList,
  Lock,
  Unlock,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import type {
  EstimateLineItem,
  EstimateStatus,
  EstimateLineType,
  EstimateDiscountType,
  UpdateEstimateOptions,
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

interface EstimateDetailTabProps {
  estimateId: string;
}

interface LocalLineItem {
  id: string;
  type: EstimateLineType;
  description: string;
  quantityStr: string;
  unitPriceStr: string;
  taxable: boolean;
  notes?: string;
  sourceWorkOrderLaborLineId?: string;
  sourceWorkOrderPartLineId?: string;
}

export const EstimateDetailTab: React.FC<EstimateDetailTabProps> = ({ estimateId }) => {
  const {
    getEstimateById,
    updateEstimate,
    reopenEstimate,
    deleteEstimate,
    getEstimateInvoices,
    createInvoice,
  } = useAutomotive();
  const {
    openWorkOrderTab,
    openVehicleTab,
    openCustomerTab,
    openInvoiceTab,
    closeTab,
    activeTabId,
    syncEstimateTitle,
  } = useTabs();

  const estimate = getEstimateById(estimateId);

  // Form states
  const [localLines, setLocalLines] = useState<LocalLineItem[]>([]);
  const [discountType, setDiscountType] = useState<EstimateDiscountType | 'none'>('none');
  const [discountValueStr, setDiscountValueStr] = useState<string>('0');
  const [taxRateStr, setTaxRateStr] = useState<string>('0');
  const [customerMessage, setCustomerMessage] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [validUntilStr, setValidUntilStr] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Associated Invoices (V0.0.9)
  const associatedInvoices = useMemo(
    () => (estimate ? getEstimateInvoices(estimate.id) : []),
    [estimate, getEstimateInvoices]
  );
  const activeInvoice = useMemo(
    () => associatedInvoices.find((i) => !i.isDeleted && i.status !== 'void'),
    [associatedInvoices]
  );

  const handleCreateInvoiceClick = async () => {
    if (!estimate || estimate.status !== 'approved') return;
    setErrorMessage(null);
    try {
      const inv = await createInvoice({ estimateId: estimate.id });
      openInvoiceTab(
        inv.id,
        `${inv.invoiceNumber} — ${inv.customerNameSnapshot || inv.vehicleDescriptionSnapshot}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  // Sync tab title when estimate loads
  useEffect(() => {
    if (estimate) {
      syncEstimateTitle(
        estimate.id,
        `${estimate.estimateNumber} — ${estimate.vehicleDescriptionSnapshot}`
      );
    }
  }, [estimate, syncEstimateTitle]);

  // Initialize form state from estimate
  useEffect(() => {
    if (estimate) {
      setLocalLines(
        (estimate.lineItems || []).map((l) => ({
          id: l.id,
          type: l.type,
          description: l.description,
          quantityStr: formatMilliQuantity(l.quantityMilli),
          unitPriceStr: (l.unitPriceCents / 100).toFixed(2),
          taxable: l.taxable,
          notes: l.notes,
          sourceWorkOrderLaborLineId: l.sourceWorkOrderLaborLineId,
          sourceWorkOrderPartLineId: l.sourceWorkOrderPartLineId,
        }))
      );

      if (estimate.discountType === 'percent') {
        setDiscountType('percent');
        setDiscountValueStr(
          estimate.discountPercentBps !== undefined
            ? (estimate.discountPercentBps / 100).toFixed(2)
            : '0'
        );
      } else if (estimate.discountType === 'fixed') {
        setDiscountType('fixed');
        setDiscountValueStr(
          estimate.fixedDiscountCents !== undefined
            ? (estimate.fixedDiscountCents / 100).toFixed(2)
            : '0'
        );
      } else {
        setDiscountType('none');
        setDiscountValueStr('0');
      }

      setTaxRateStr(
        estimate.taxRateBps !== undefined ? (estimate.taxRateBps / 100).toFixed(2) : '0'
      );
      setCustomerMessage(estimate.customerMessage || '');
      setNotes(estimate.notes || '');
      setValidUntilStr(
        estimate.validUntil ? new Date(estimate.validUntil).toISOString().split('T')[0] : ''
      );
    }
  }, [estimate?.id]);

  const isApproved = estimate?.status === 'approved';

  // Real-time Preview Calculation
  const previewTotals = useMemo(() => {
    const parsedLines = localLines.map((l) => {
      let quantityMilli = 0;
      let unitPriceCents = 0;
      try {
        quantityMilli = parseQuantityToMilli(l.quantityStr);
      } catch {
        quantityMilli = 0;
      }
      try {
        unitPriceCents = parseCurrencyStringToCents(l.unitPriceStr);
      } catch {
        unitPriceCents = 0;
      }
      return {
        quantityMilli,
        unitPriceCents,
        taxable: l.taxable,
      };
    });

    let taxRateBps = 0;
    try {
      taxRateBps = parsePercentToBps(taxRateStr);
    } catch {
      taxRateBps = 0;
    }

    let parsedDiscountType: EstimateDiscountType | undefined = undefined;
    let fixedDiscountCents: number | undefined = undefined;
    let discountPercentBps: number | undefined = undefined;

    if (discountType === 'percent') {
      parsedDiscountType = 'percent';
      try {
        discountPercentBps = parsePercentToBps(discountValueStr);
      } catch {
        discountPercentBps = 0;
      }
    } else if (discountType === 'fixed') {
      parsedDiscountType = 'fixed';
      try {
        fixedDiscountCents = parseCurrencyStringToCents(discountValueStr);
      } catch {
        fixedDiscountCents = 0;
      }
    }

    return calculateEstimateTotals(
      parsedLines,
      taxRateBps,
      parsedDiscountType,
      fixedDiscountCents,
      discountPercentBps
    );
  }, [localLines, discountType, discountValueStr, taxRateStr]);

  // Line item handlers
  const handleAddLine = () => {
    if (isApproved) return;
    setLocalLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'labor',
        description: '',
        quantityStr: '1',
        unitPriceStr: '0.00',
        taxable: false,
      },
    ]);
  };

  const handleUpdateLine = (id: string, field: keyof LocalLineItem, val: unknown) => {
    if (isApproved) return;
    setLocalLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, [field]: val } : line))
    );
  };

  const handleRemoveLine = (id: string) => {
    if (isApproved) return;
    setLocalLines((prev) => prev.filter((line) => line.id !== id));
  };

  // Save changes to Main
  const handleSave = async (targetStatus?: EstimateStatus) => {
    if (!estimate || isApproved) return;
    setErrorMessage(null);
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Validate and convert lines
      const convertedLines: Array<Omit<EstimateLineItem, 'id'> & { id?: string }> = [];
      for (const line of localLines) {
        const desc = line.description.trim();
        if (!desc) {
          throw new Error('All line items must have a description');
        }

        const quantityMilli = parseQuantityToMilli(line.quantityStr);
        const unitPriceCents = parseCurrencyStringToCents(line.unitPriceStr);

        if (unitPriceCents < 0) {
          throw new Error(`Unit price for "${desc}" cannot be negative`);
        }

        convertedLines.push({
          id: line.id.startsWith('line-') ? undefined : line.id,
          type: line.type,
          description: desc,
          quantityMilli,
          unitPriceCents,
          taxable: line.taxable,
          notes: line.notes?.trim() || undefined,
          sourceWorkOrderLaborLineId: line.sourceWorkOrderLaborLineId,
          sourceWorkOrderPartLineId: line.sourceWorkOrderPartLineId,
        });
      }

      let taxRateBps = 0;
      if (taxRateStr.trim()) {
        taxRateBps = parsePercentToBps(taxRateStr.trim());
      }

      let parsedDiscountType: EstimateDiscountType | undefined = undefined;
      let fixedDiscountCents: number | undefined = undefined;
      let discountPercentBps: number | undefined = undefined;

      if (discountType === 'percent') {
        parsedDiscountType = 'percent';
        discountPercentBps = parsePercentToBps(discountValueStr.trim());
        if (discountPercentBps > 10000) {
          throw new Error('Percentage discount cannot exceed 100%');
        }
      } else if (discountType === 'fixed') {
        parsedDiscountType = 'fixed';
        fixedDiscountCents = parseCurrencyStringToCents(discountValueStr.trim());
      }

      let validUntil: number | undefined = undefined;
      if (validUntilStr) {
        const ts = new Date(validUntilStr).getTime();
        if (!isNaN(ts)) validUntil = ts;
      }

      const updates: UpdateEstimateOptions = {
        lineItems: convertedLines,
        taxRateBps,
        discountType: parsedDiscountType,
        fixedDiscountCents,
        discountPercentBps,
        customerMessage: customerMessage.trim() || undefined,
        notes: notes.trim() || undefined,
        validUntil,
        status: targetStatus || estimate.status,
      };

      await updateEstimate(estimate.id, updates);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusTransition = async (newStatus: EstimateStatus) => {
    if (!estimate) return;
    if (newStatus === 'approved' && estimate.status !== 'approved') {
      // First save any current changes, then set approved
      await handleSave('approved');
    } else {
      await handleSave(newStatus);
    }
  };

  const handleReopen = async () => {
    if (!estimate) return;
    setErrorMessage(null);
    try {
      await reopenEstimate(estimate.id);
      setShowReopenModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  const handleDelete = async () => {
    if (!estimate) return;
    setErrorMessage(null);
    try {
      await deleteEstimate(estimate.id);
      setShowDeleteModal(false);
      closeTab(activeTabId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
    }
  };

  const handleExportPDF = async () => {
    if (!estimate) return;
    try {
      if (window.artemisAPI?.documents?.exportPDF) {
        const filename = `${estimate.estimateNumber}-${estimate.vehicleDescriptionSnapshot.replace(/\s+/g, '-')}`;
        await window.artemisAPI.documents.exportPDF(filename);
      } else {
        window.print();
      }
    } catch (err) {
      console.error('PDF export failed:', err);
      window.print();
    }
  };

  if (!estimate) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-950">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Estimate Not Found</h2>
        <p className="text-slate-400 text-sm mb-4">
          This estimate may have been deleted or archived.
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

  const getStatusBadge = (status: EstimateStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Draft</span>
          </span>
        );
      case 'ready':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-900/40 text-blue-300 border border-blue-700/50 flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Ready for Review</span>
          </span>
        );
      case 'approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 flex items-center space-x-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Approved</span>
          </span>
        );
      case 'declined':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-900/40 text-red-300 border border-red-700/50 flex items-center space-x-1.5">
            <XCircle className="w-3.5 h-3.5" />
            <span>Declined</span>
          </span>
        );
      case 'expired':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-900/40 text-amber-300 border border-amber-700/50">
            Expired
          </span>
        );
      case 'superseded':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-900/40 text-purple-300 border border-purple-700/50">
            Superseded
          </span>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-y-auto print:bg-white print:text-black">
      {/* Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-8 py-4 shrink-0 flex items-center justify-between print:hidden">
        <div className="flex items-center space-x-4">
          <div className="p-2.5 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-500/20">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-black text-white tracking-tight">
                {estimate.estimateNumber}
              </h1>
              {getStatusBadge(estimate.status)}
            </div>
            <div className="flex items-center space-x-4 mt-1 text-xs text-slate-400">
              <button
                onClick={() =>
                  openWorkOrderTab(estimate.workOrderId, estimate.workOrderNumberSnapshot)
                }
                className="flex items-center space-x-1 hover:text-teal-300 transition-colors"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span className="font-semibold">{estimate.workOrderNumberSnapshot}</span>
              </button>
              <span>•</span>
              <button
                onClick={() =>
                  openVehicleTab(estimate.vehicleId, estimate.vehicleDescriptionSnapshot)
                }
                className="flex items-center space-x-1 hover:text-teal-300 transition-colors"
              >
                <Car className="w-3.5 h-3.5" />
                <span>{estimate.vehicleDescriptionSnapshot}</span>
              </button>
              {estimate.customerId && (
                <>
                  <span>•</span>
                  <button
                    onClick={() =>
                      openCustomerTab(
                        estimate.customerId!,
                        estimate.customerNameSnapshot || 'Customer'
                      )
                    }
                    className="flex items-center space-x-1 hover:text-teal-300 transition-colors"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>{estimate.customerNameSnapshot || 'Customer'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors border border-slate-700"
          >
            <FileDown className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => window.print()}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition-colors border border-slate-700"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>

          <div className="h-6 w-px bg-slate-800 mx-1" />

          {/* Status Controls */}
          {estimate.status === 'draft' && (
            <>
              <button
                onClick={() => handleStatusTransition('ready')}
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Mark Ready
              </button>
              <button
                onClick={() => handleStatusTransition('approved')}
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-emerald-950/40"
              >
                Approve
              </button>
            </>
          )}

          {estimate.status === 'ready' && (
            <>
              <button
                onClick={() => handleStatusTransition('draft')}
                disabled={isSaving}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Back to Draft
              </button>
              <button
                onClick={() => handleStatusTransition('declined')}
                disabled={isSaving}
                className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/60 text-red-300 rounded-lg text-xs font-semibold transition-colors border border-red-800"
              >
                Decline
              </button>
              <button
                onClick={() => handleStatusTransition('approved')}
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-emerald-950/40"
              >
                Approve
              </button>
            </>
          )}

          {estimate.status === 'approved' && (
            <div className="flex items-center space-x-2">
              {activeInvoice ? (
                <button
                  type="button"
                  onClick={() =>
                    openInvoiceTab(
                      activeInvoice.id,
                      `${activeInvoice.invoiceNumber} — ${activeInvoice.customerNameSnapshot || activeInvoice.vehicleDescriptionSnapshot}`
                    )
                  }
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-colors"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Open Invoice ({activeInvoice.invoiceNumber})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateInvoiceClick}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-amber-950/40"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>Create Invoice</span>
                </button>
              )}
              <button
                onClick={() => setShowReopenModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Reopen Estimate</span>
              </button>
            </div>
          )}

          {estimate.status === 'declined' && (
            <button
              onClick={() => setShowReopenModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Reopen Proposal</span>
            </button>
          )}

          {!isApproved && (
            <button
              onClick={() => handleSave()}
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-teal-950/30 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Lock Banner if Approved */}
      {isApproved && (
        <div className="bg-emerald-950/40 border-b border-emerald-800/40 px-8 py-2.5 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2 text-xs text-emerald-300">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Estimate Approved</strong> · Commercial proposal terms and pricing are locked
              for customer audit integrity.
              {estimate.approvedAt &&
                ` (Approved ${new Date(estimate.approvedAt).toLocaleDateString()})`}
            </span>
          </div>
          <button
            onClick={() => setShowReopenModal(true)}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
          >
            Reopen to modify
          </button>
        </div>
      )}

      {/* Error / Success feedback */}
      {errorMessage && (
        <div className="mx-8 mt-4 p-3 bg-red-950/50 border border-red-800 rounded-lg flex items-center space-x-2 text-sm text-red-300 print:hidden">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
      {saveSuccess && (
        <div className="mx-8 mt-4 p-3 bg-emerald-950/50 border border-emerald-800 rounded-lg flex items-center space-x-2 text-sm text-emerald-300 print:hidden">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Estimate updated and totals verified authoritatively by Main process.</span>
        </div>
      )}

      {/* Customer Printable Document View (shown on screen and print) */}
      <div className="max-w-5xl w-full mx-auto p-8 space-y-6 flex-1">
        {/* Printable Letterhead / Header */}
        <div className="border-b border-slate-800 pb-6 print:border-black">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-2xl font-black text-white tracking-tight uppercase print:text-black">
                Estimate / Commercial Proposal
              </div>
              <div className="text-sm font-semibold text-teal-400 mt-0.5 print:text-gray-700">
                {estimate.estimateNumber}
              </div>
            </div>
            <div className="text-right text-xs text-slate-400 print:text-gray-600 space-y-1">
              <div>
                <span className="font-semibold text-slate-300 print:text-black">Date: </span>
                {new Date(estimate.createdAt).toLocaleDateString()}
              </div>
              {estimate.validUntil && (
                <div>
                  <span className="font-semibold text-slate-300 print:text-black">Valid Until: </span>
                  {new Date(estimate.validUntil).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-6 p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 print:bg-gray-50 print:border-gray-300">
            <div>
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-1 print:text-gray-500">
                Customer
              </span>
              <div className="text-sm font-bold text-white print:text-black">
                {estimate.customerNameSnapshot || 'Customer'}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block mb-1 print:text-gray-500">
                Vehicle & Work Order
              </span>
              <div className="text-sm font-bold text-white print:text-black">
                {estimate.vehicleDescriptionSnapshot}
              </div>
              <div className="text-xs text-slate-400 mt-0.5 print:text-gray-600">
                Work Order: {estimate.workOrderNumberSnapshot}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Message */}
        {customerMessage && (
          <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-lg text-sm text-slate-300 italic print:bg-white print:border-gray-200 print:text-gray-800">
            "{customerMessage}"
          </div>
        )}

        {/* Line Items Table */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden print:border-gray-300 print:bg-white">
          <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between print:border-gray-300">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider print:text-black">
              Proposed Operations & Materials
            </h3>
            {!isApproved && (
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center space-x-1 px-3 py-1 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 rounded text-xs font-semibold transition-colors print:hidden"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 print:bg-gray-100 print:text-gray-700 print:border-gray-300">
                <tr>
                  <th className="px-4 py-2.5 w-24">Type</th>
                  <th className="px-4 py-2.5">Description</th>
                  <th className="px-4 py-2.5 w-24 text-right">Qty / Hrs</th>
                  <th className="px-4 py-2.5 w-28 text-right">Unit Price</th>
                  <th className="px-4 py-2.5 w-16 text-center">Tax</th>
                  <th className="px-4 py-2.5 w-28 text-right">Total</th>
                  {!isApproved && <th className="px-3 py-2.5 w-12 print:hidden"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-200">
                {localLines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isApproved ? 6 : 7}
                      className="px-6 py-8 text-center text-slate-500 italic"
                    >
                      No line items on this estimate yet. Click "+ Add Item" to begin pricing.
                    </td>
                  </tr>
                ) : (
                  localLines.map((line) => {
                    let qMilli = 0;
                    let uCents = 0;
                    try {
                      qMilli = parseQuantityToMilli(line.quantityStr);
                    } catch {}
                    try {
                      uCents = parseCurrencyStringToCents(line.unitPriceStr);
                    } catch {}
                    const lineTotalCents = calculateLineTotalCents(qMilli, uCents);

                    return (
                      <tr
                        key={line.id}
                        className="hover:bg-slate-800/30 transition-colors print:hover:bg-transparent"
                      >
                        <td className="px-4 py-2.5 align-top">
                          {isApproved ? (
                            <span className="capitalize font-semibold text-slate-300 print:text-black">
                              {line.type}
                            </span>
                          ) : (
                            <select
                              value={line.type}
                              onChange={(e) =>
                                handleUpdateLine(line.id, 'type', e.target.value as EstimateLineType)
                              }
                              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-500"
                            >
                              <option value="labor">Labor</option>
                              <option value="part">Part</option>
                              <option value="material">Material</option>
                              <option value="fee">Fee</option>
                              <option value="other">Other</option>
                            </select>
                          )}
                        </td>
                        <td className="px-4 py-2.5 align-top">
                          {isApproved ? (
                            <div>
                              <div className="font-semibold text-white print:text-black">
                                {line.description}
                              </div>
                              {line.notes && (
                                <div className="text-[11px] text-slate-400 print:text-gray-600">
                                  {line.notes}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) =>
                                  handleUpdateLine(line.id, 'description', e.target.value)
                                }
                                placeholder="Description..."
                                className="w-full bg-slate-800/80 border border-slate-700 rounded px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                              />
                              <input
                                type="text"
                                value={line.notes || ''}
                                onChange={(e) => handleUpdateLine(line.id, 'notes', e.target.value)}
                                placeholder="Optional line notes / part #..."
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-400 placeholder-slate-600 focus:outline-none focus:border-slate-600"
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 align-top text-right">
                          {isApproved ? (
                            <span className="font-mono text-white print:text-black">
                              {line.quantityStr}
                            </span>
                          ) : (
                            <input
                              type="text"
                              value={line.quantityStr}
                              onChange={(e) =>
                                handleUpdateLine(line.id, 'quantityStr', e.target.value)
                              }
                              className="w-16 bg-slate-800/80 border border-slate-700 rounded px-2 py-1 text-xs text-white text-right font-mono focus:outline-none focus:border-teal-500"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2.5 align-top text-right">
                          {isApproved ? (
                            <span className="font-mono text-white print:text-black">
                              {formatCents(uCents)}
                            </span>
                          ) : (
                            <div className="relative inline-block">
                              <span className="absolute left-1.5 top-1 text-slate-500 text-xs">
                                $
                              </span>
                              <input
                                type="text"
                                value={line.unitPriceStr}
                                onChange={(e) =>
                                  handleUpdateLine(line.id, 'unitPriceStr', e.target.value)
                                }
                                className="w-20 bg-slate-800/80 border border-slate-700 rounded pl-4 pr-1.5 py-1 text-xs text-white text-right font-mono focus:outline-none focus:border-teal-500"
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 align-top text-center">
                          {isApproved ? (
                            <span className="text-slate-400 font-mono">
                              {line.taxable ? '✓' : '—'}
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={line.taxable}
                              onChange={(e) =>
                                handleUpdateLine(line.id, 'taxable', e.target.checked)
                              }
                              className="rounded bg-slate-900 border-slate-700 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 mt-1"
                            />
                          )}
                        </td>
                        <td className="px-4 py-2.5 align-top text-right font-mono font-bold text-white print:text-black">
                          {formatCents(lineTotalCents)}
                        </td>
                        {!isApproved && (
                          <td className="px-3 py-2.5 align-top text-center print:hidden">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id)}
                              className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
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

        {/* Financial Totals and Pricing Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Controls column (Discount, Tax, Validity) */}
          <div className="space-y-4 print:hidden">
            {!isApproved ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Discount & Tax Controls
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Discount Type
                    </label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="none">No Discount</option>
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed Dollar ($)</option>
                    </select>
                  </div>

                  {discountType !== 'none' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Discount Value {discountType === 'percent' ? '(%)' : '($)'}
                      </label>
                      <input
                        type="text"
                        value={discountValueStr}
                        onChange={(e) => setDiscountValueStr(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Tax Rate (%)
                    </label>
                    <input
                      type="text"
                      value={taxRateStr}
                      onChange={(e) => setTaxRateStr(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Valid Until Date
                    </label>
                    <input
                      type="date"
                      value={validUntilStr}
                      onChange={(e) => setValidUntilStr(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Customer Message
                  </label>
                  <textarea
                    rows={2}
                    value={customerMessage}
                    onChange={(e) => setCustomerMessage(e.target.value)}
                    placeholder="Proposal message for customer..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
                <div className="font-semibold text-slate-300">Commercial Proposal Terms</div>
                <div>Tax Rate: {formatBpsToPercent(estimate.taxRateBps)}</div>
                {estimate.discountType && (
                  <div>
                    Discount:{' '}
                    {estimate.discountType === 'percent'
                      ? `${formatBpsToPercent(estimate.discountPercentBps || 0)} (${formatCents(estimate.discountTotalCents)})`
                      : formatCents(estimate.fixedDiscountCents || 0)}
                  </div>
                )}
                {estimate.validUntil && (
                  <div>Valid Until: {new Date(estimate.validUntil).toLocaleDateString()}</div>
                )}
              </div>
            )}

            {/* Associated Invoices Card (V0.0.9) */}
            {associatedInvoices.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 print:hidden">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                    <Receipt className="w-4 h-4 text-amber-400" />
                    <span>Invoices ({associatedInvoices.length})</span>
                  </h4>
                </div>
                <div className="space-y-2">
                  {associatedInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            openInvoiceTab(
                              inv.id,
                              `${inv.invoiceNumber} — ${inv.customerNameSnapshot || inv.vehicleDescriptionSnapshot}`
                            )
                          }
                          className="font-mono font-bold text-xs text-amber-400 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </button>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            inv.status === 'issued'
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                              : inv.status === 'void'
                              ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                        {inv.issuedAt && (
                          <span className="text-[11px] text-slate-400">
                            Issued {new Date(inv.issuedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-mono font-bold text-xs text-slate-200">
                          {formatCents(inv.totalCents)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            openInvoiceTab(
                              inv.id,
                              `${inv.invoiceNumber} — ${inv.customerNameSnapshot || inv.vehicleDescriptionSnapshot}`
                            )
                          }
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Internal notes */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Internal Shop Notes (Not Printed)
              </h4>
              {isApproved ? (
                <div className="text-xs text-slate-400 italic">
                  {notes || 'No internal notes.'}
                </div>
              ) : (
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes, margin targets, vendor details..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              )}
            </div>
          </div>

          {/* Totals Summary Column */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4 print:bg-white print:border-gray-300">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider print:text-gray-700">
              Financial Summary
            </h4>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center text-slate-300 print:text-black">
                <span>Subtotal</span>
                <span className="font-mono font-semibold">
                  {formatCents(previewTotals.subtotalCents)}
                </span>
              </div>

              {previewTotals.discountTotalCents > 0 && (
                <div className="flex justify-between items-center text-emerald-400 print:text-emerald-700">
                  <span>
                    Discount{' '}
                    {discountType === 'percent' && `(${formatBpsToPercent(parsePercentToBps(discountValueStr))})`}
                  </span>
                  <span className="font-mono font-semibold">
                    -{formatCents(previewTotals.discountTotalCents)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-xs text-slate-400 print:text-gray-600 pt-1 border-t border-slate-800/60 print:border-gray-200">
                <span>Taxable Subtotal</span>
                <span className="font-mono">{formatCents(previewTotals.taxableSubtotalCents)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-300 print:text-black">
                <span>
                  Sales Tax ({taxRateStr}%)
                </span>
                <span className="font-mono font-semibold">
                  {formatCents(previewTotals.taxTotalCents)}
                </span>
              </div>

              <div className="pt-3 border-t-2 border-slate-700 print:border-black flex justify-between items-center">
                <span className="text-base font-black text-white uppercase print:text-black">
                  Total Proposal
                </span>
                <span className="text-2xl font-black text-teal-400 font-mono print:text-black">
                  {formatCents(previewTotals.totalCents)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 print:hidden pt-2 border-t border-slate-800">
              ⚡ Calculated with 100% integer cent & basis-point precision.
            </div>
          </div>
        </div>

        {/* Footer Actions (Delete) */}
        <div className="pt-6 border-t border-slate-800 flex justify-between items-center print:hidden">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={isApproved}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 border border-red-900/50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={isApproved ? 'Approved estimates cannot be deleted' : 'Delete estimate'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Estimate</span>
          </button>

          {!isApproved && (
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving}
              className="flex items-center space-x-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-teal-950/40 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Estimate'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Reopen Estimate?</h3>
            </div>
            {activeInvoice ? (
              <div className="bg-rose-950/30 border border-rose-800/50 rounded-lg p-3 text-xs text-rose-300 space-y-1.5">
                <p className="font-bold">
                  Active Invoice Exists: {activeInvoice.invoiceNumber} ({activeInvoice.status})
                </p>
                <p>
                  This Estimate cannot be reopened while active Invoice{' '}
                  <span className="font-mono font-semibold">{activeInvoice.invoiceNumber}</span> is
                  pending or issued. Please delete draft invoices or void issued invoices before
                  reopening the estimate.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-300">
                This estimate has already been approved. Reopening will transition its status back to{' '}
                <strong>Draft</strong> and allow its commercial terms and pricing to be modified.
              </p>
            )}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              {!activeInvoice && (
                <button
                  type="button"
                  onClick={handleReopen}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-amber-950/40 transition-colors"
                >
                  Reopen Proposal
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Delete Estimate?</h3>
            </div>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete <strong>{estimate.estimateNumber}</strong>? This
              record will be archived.
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
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-red-950/40 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
