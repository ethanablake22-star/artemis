import React from 'react';
import { useTabs } from '../../state/TabContext';
import { HomeTab } from './home/HomeTab';
import { LibraryTab } from './library/LibraryTab';
import { DocumentTab } from './document/DocumentTab';
import { AutomotiveHubTab } from './automotive/AutomotiveHubTab';
import { CustomerDetailTab } from './automotive/CustomerDetailTab';
import { VehicleDetailTab } from './automotive/VehicleDetailTab';
import { WorkOrderDetailTab } from './automotive/WorkOrderDetailTab';
import { EstimateDetailTab } from './automotive/estimates/EstimateDetailTab';
import { InvoiceDetailTab } from './automotive/invoices/InvoiceDetailTab';
import { ScheduleTab } from './schedule/ScheduleTab';
import { ScheduleEventDetailTab } from './schedule/ScheduleEventDetailTab';
import { Construction, Sparkles } from 'lucide-react';

export const TabHost: React.FC = () => {
  const { activeTab } = useTabs();

  if (!activeTab) {
    return (
      <div className="h-full w-full flex items-center justify-center text-slate-500 text-sm">
        No active tab selected.
      </div>
    );
  }

  // Render view engine based on tab type
  switch (activeTab.type) {
    case 'home':
      return <HomeTab />;
    case 'library':
      return <LibraryTab />;
    case 'document':
      return <DocumentTab libraryItemId={activeTab.resourceId || ''} />;
    case 'automotive':
      return <AutomotiveHubTab />;
    case 'automotive-customer':
      return <CustomerDetailTab customerId={activeTab.resourceId || ''} />;
    case 'automotive-vehicle':
      return <VehicleDetailTab vehicleId={activeTab.resourceId || ''} />;
    case 'automotive-work-order':
      return <WorkOrderDetailTab workOrderId={activeTab.resourceId || ''} />;
    case 'automotive-estimate':
      return <EstimateDetailTab estimateId={activeTab.resourceId || ''} />;
    case 'automotive-invoice':
      return <InvoiceDetailTab invoiceId={activeTab.resourceId || ''} />;
    case 'schedule':
    case 'calendar':
      return <ScheduleTab />;
    case 'schedule-event':
      return <ScheduleEventDetailTab eventId={activeTab.resourceId || ''} />;
    default:
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center">
          <div className="p-4 rounded-2xl bg-artemis-950/80 border border-slate-800 mb-4 shadow-xl">
            <Construction className="w-8 h-8 text-artemis-accent" />
          </div>
          <h3 className="text-base font-bold text-slate-200">
            {activeTab.title} — Engine Placeholder
          </h3>
          <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
            This Artemis tab is configured for <code className="text-artemis-accent">'{activeTab.type}'</code>. Future tasks will mount the dedicated engine (e.g. Chromium, Monaco, CAD, PCB) into this universal tab container.
          </p>
          <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/50">
            <Sparkles className="w-3.5 h-3.5 text-artemis-accent" />
            Universal Tab Container Ready
          </div>
        </div>
      );
  }
};
