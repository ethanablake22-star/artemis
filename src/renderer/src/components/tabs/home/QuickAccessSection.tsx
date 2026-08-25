import React, { useState } from 'react';
import {
  Zap,
  ClipboardList,
  UserPlus,
  Car,
  Calendar,
  FilePlus,
  FolderOpen,
} from 'lucide-react';
import { useAutomotive } from '../../../state/AutomotiveContext';
import { useSchedule } from '../../../state/ScheduleContext';
import { useLibrary } from '../../../state/LibraryContext';
import { useTabs } from '../../../state/TabContext';
import { CreateCustomerModal } from '../automotive/CreateCustomerModal';
import { CreateVehicleModal } from '../automotive/CreateVehicleModal';
import { CreateWorkOrderModal } from '../automotive/CreateWorkOrderModal';
import { CreateEventModal } from '../schedule/CreateEventModal';
import type {
  CreateCustomerOptions,
  CreateVehicleOptions,
  CreateWorkOrderOptions,
} from '@shared/automotiveTypes';
import type { CreateScheduleEventOptions } from '@shared/scheduleTypes';

export const QuickAccessSection: React.FC = () => {
  const { customers, vehicles, createCustomer, createVehicle, createWorkOrder } = useAutomotive();
  const { createEvent } = useSchedule();
  const { createDocument } = useLibrary();
  const {
    openCustomerTab,
    openVehicleTab,
    openWorkOrderTab,
    openScheduleEventTab,
    openDocumentTab,
    openTab,
  } = useTabs();

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Quick action handlers
  const handleCreateCustomer = async (options: CreateCustomerOptions) => {
    const created = await createCustomer(options);
    setIsCustomerModalOpen(false);
    openCustomerTab(created.id, created.name);
  };

  const handleCreateVehicle = async (options: CreateVehicleOptions) => {
    const created = await createVehicle(options);
    setIsVehicleModalOpen(false);
    openVehicleTab(created.id, `${created.year ? `${created.year} ` : ''}${created.make} ${created.model}`);
  };

  const handleCreateWorkOrder = async (options: CreateWorkOrderOptions) => {
    const created = await createWorkOrder(options);
    setIsWorkOrderModalOpen(false);
    openWorkOrderTab(created.id, created.workOrderNumber);
  };

  const handleCreateEvent = async (options: CreateScheduleEventOptions) => {
    const created = await createEvent(options);
    setIsEventModalOpen(false);
    openScheduleEventTab(created.id, created.title);
  };

  const handleCreateDocument = async () => {
    const newDoc = await createDocument('Untitled Document', null);
    openDocumentTab(newDoc.id, newDoc.name);
  };

  const handleOpenLibrary = () => {
    openTab({ id: 'library', type: 'library', title: 'Library', closable: true });
  };

  const quickActions = [
    {
      id: 'new-wo',
      title: 'New Work Order',
      description: 'Start repair or diagnostic',
      icon: ClipboardList,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/50',
      action: () => setIsWorkOrderModalOpen(true),
    },
    {
      id: 'new-event',
      title: 'Schedule Appointment',
      description: 'Book service or drop-off',
      icon: Calendar,
      color: 'from-rose-500/20 to-orange-500/10 text-rose-400 border-rose-500/30 hover:border-rose-500/50',
      action: () => setIsEventModalOpen(true),
    },
    {
      id: 'new-doc',
      title: 'New Document',
      description: 'Contract or procedure',
      icon: FilePlus,
      color: 'from-indigo-500/20 to-cyan-500/10 text-indigo-400 border-indigo-500/30 hover:border-indigo-500/50',
      action: handleCreateDocument,
    },
    {
      id: 'new-customer',
      title: 'New Customer',
      description: 'Individual or business',
      icon: UserPlus,
      color: 'from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30 hover:border-blue-500/50',
      action: () => setIsCustomerModalOpen(true),
    },
    {
      id: 'new-vehicle',
      title: 'New Vehicle',
      description: 'Add vehicle record',
      icon: Car,
      color: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30 hover:border-amber-500/50',
      action: () => setIsVehicleModalOpen(true),
    },
    {
      id: 'open-library',
      title: 'Open Library',
      description: 'Explore file hierarchy',
      icon: FolderOpen,
      color: 'from-slate-700/30 to-slate-800/20 text-slate-300 border-slate-700 hover:border-slate-600',
      action: handleOpenLibrary,
    },
  ];

  return (
    <div className="bg-artemis-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3.5 border-b border-slate-800 mb-4">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200">
            Quick Access
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            Fast Creation & Navigation
          </span>
        </div>
      </div>

      {/* Grid of Action Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickActions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              onClick={act.action}
              className={`group flex flex-col items-start p-3.5 rounded-xl bg-gradient-to-br border ${act.color} transition-all duration-150 hover:scale-[1.02] text-left cursor-pointer shadow-sm`}
            >
              <div className="p-2 rounded-lg bg-artemis-950/80 mb-2.5 group-hover:scale-110 transition-transform">
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-100 group-hover:text-white transition-colors">
                {act.title}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                {act.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Modals */}
      <CreateCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSubmit={handleCreateCustomer}
      />
      <CreateVehicleModal
        isOpen={isVehicleModalOpen}
        customers={customers}
        onClose={() => setIsVehicleModalOpen(false)}
        onSubmit={handleCreateVehicle}
      />
      <CreateWorkOrderModal
        isOpen={isWorkOrderModalOpen}
        vehicles={vehicles}
        customers={customers}
        onClose={() => setIsWorkOrderModalOpen(false)}
        onSubmit={handleCreateWorkOrder}
      />
      <CreateEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSubmit={handleCreateEvent}
      />
    </div>
  );
};
