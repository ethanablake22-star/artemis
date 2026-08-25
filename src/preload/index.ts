import { contextBridge, ipcRenderer } from 'electron';
import type { ArtemisWindowBridge } from '../shared/types';
import type {
  LibraryItem,
  CreateLibraryItemOptions,
  UpdateLibraryItemOptions,
  ListLibraryItemsFilter,
} from '../shared/libraryTypes';
import type { ArtemisDocumentRecord, ExportPdfResult } from '../shared/documentTypes';
import type {
  CustomerRecord,
  VehicleRecord,
  WorkOrderRecord,
  CreateCustomerOptions,
  UpdateCustomerOptions,
  CreateVehicleOptions,
  UpdateVehicleOptions,
  CreateWorkOrderOptions,
  UpdateWorkOrderOptions,
  ListCustomersFilter,
  ListVehiclesFilter,
  ListWorkOrdersFilter,
} from '../shared/automotiveTypes';
import type {
  ScheduleEventRecord,
  CreateScheduleEventOptions,
  UpdateScheduleEventOptions,
  ListScheduleEventsFilter,
  OverlapConflictInfo,
} from '../shared/scheduleTypes';
import type {
  CurrentMissionReference,
  SetCurrentMissionOptions,
} from '../shared/homeTypes';

const bridge: ArtemisWindowBridge = {
  minimize: () => ipcRenderer.send('artemis:window:minimize'),
  maximize: () => ipcRenderer.send('artemis:window:maximize'),
  close: () => ipcRenderer.send('artemis:window:close'),
  isMaximized: () => ipcRenderer.invoke('artemis:window:isMaximized'),
  getAppVersion: () => ipcRenderer.invoke('artemis:app:version'),
  library: {
    list: (filter?: ListLibraryItemsFilter): Promise<LibraryItem[]> =>
      ipcRenderer.invoke('artemis:library:list', filter),
    get: (id: string): Promise<LibraryItem | null> =>
      ipcRenderer.invoke('artemis:library:get', id),
    create: (options: CreateLibraryItemOptions): Promise<LibraryItem> =>
      ipcRenderer.invoke('artemis:library:create', options),
    update: (id: string, updates: UpdateLibraryItemOptions): Promise<LibraryItem> =>
      ipcRenderer.invoke('artemis:library:update', id, updates),
    move: (id: string, newParentId: string | null): Promise<LibraryItem> =>
      ipcRenderer.invoke('artemis:library:move', id, newParentId),
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('artemis:library:delete', id),
  },
  documents: {
    get: (libraryItemId: string): Promise<ArtemisDocumentRecord> =>
      ipcRenderer.invoke('artemis:documents:get', libraryItemId),
    updateContent: (
      libraryItemId: string,
      content: Record<string, unknown>
    ): Promise<ArtemisDocumentRecord> =>
      ipcRenderer.invoke('artemis:documents:updateContent', libraryItemId, content),
    exportPDF: (defaultTitle?: string): Promise<ExportPdfResult> =>
      ipcRenderer.invoke('artemis:documents:exportPDF', defaultTitle),
  },
  automotive: {
    listCustomers: (filter?: ListCustomersFilter): Promise<CustomerRecord[]> =>
      ipcRenderer.invoke('artemis:automotive:listCustomers', filter),
    getCustomer: (id: string): Promise<CustomerRecord | null> =>
      ipcRenderer.invoke('artemis:automotive:getCustomer', id),
    createCustomer: (options: CreateCustomerOptions): Promise<CustomerRecord> =>
      ipcRenderer.invoke('artemis:automotive:createCustomer', options),
    updateCustomer: (id: string, updates: UpdateCustomerOptions): Promise<CustomerRecord> =>
      ipcRenderer.invoke('artemis:automotive:updateCustomer', id, updates),
    deleteCustomer: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('artemis:automotive:deleteCustomer', id),

    listVehicles: (filter?: ListVehiclesFilter): Promise<VehicleRecord[]> =>
      ipcRenderer.invoke('artemis:automotive:listVehicles', filter),
    getVehicle: (id: string): Promise<VehicleRecord | null> =>
      ipcRenderer.invoke('artemis:automotive:getVehicle', id),
    createVehicle: (options: CreateVehicleOptions): Promise<VehicleRecord> =>
      ipcRenderer.invoke('artemis:automotive:createVehicle', options),
    updateVehicle: (id: string, updates: UpdateVehicleOptions): Promise<VehicleRecord> =>
      ipcRenderer.invoke('artemis:automotive:updateVehicle', id, updates),
    deleteVehicle: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('artemis:automotive:deleteVehicle', id),

    listWorkOrders: (filter?: ListWorkOrdersFilter): Promise<WorkOrderRecord[]> =>
      ipcRenderer.invoke('artemis:automotive:listWorkOrders', filter),
    getWorkOrder: (id: string): Promise<WorkOrderRecord | null> =>
      ipcRenderer.invoke('artemis:automotive:getWorkOrder', id),
    createWorkOrder: (options: CreateWorkOrderOptions): Promise<WorkOrderRecord> =>
      ipcRenderer.invoke('artemis:automotive:createWorkOrder', options),
    updateWorkOrder: (id: string, updates: UpdateWorkOrderOptions): Promise<WorkOrderRecord> =>
      ipcRenderer.invoke('artemis:automotive:updateWorkOrder', id, updates),
    deleteWorkOrder: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('artemis:automotive:deleteWorkOrder', id),
  },
  schedule: {
    list: (filter?: ListScheduleEventsFilter): Promise<ScheduleEventRecord[]> =>
      ipcRenderer.invoke('artemis:schedule:list', filter),
    get: (id: string): Promise<ScheduleEventRecord | null> =>
      ipcRenderer.invoke('artemis:schedule:get', id),
    create: (options: CreateScheduleEventOptions): Promise<ScheduleEventRecord> =>
      ipcRenderer.invoke('artemis:schedule:create', options),
    update: (id: string, updates: UpdateScheduleEventOptions): Promise<ScheduleEventRecord> =>
      ipcRenderer.invoke('artemis:schedule:update', id, updates),
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('artemis:schedule:delete', id),
    checkOverlap: (
      startAt: number,
      endAt: number,
      excludeEventId?: string
    ): Promise<OverlapConflictInfo> =>
      ipcRenderer.invoke('artemis:schedule:checkOverlap', startAt, endAt, excludeEventId),
  },
  home: {
    getCurrentMission: (): Promise<CurrentMissionReference | null> =>
      ipcRenderer.invoke('artemis:home:getCurrentMission'),
    setCurrentMission: (options: SetCurrentMissionOptions): Promise<CurrentMissionReference> =>
      ipcRenderer.invoke('artemis:home:setCurrentMission', options),
    clearCurrentMission: (): Promise<boolean> =>
      ipcRenderer.invoke('artemis:home:clearCurrentMission'),
  },
};

contextBridge.exposeInMainWorld('artemisAPI', bridge);
