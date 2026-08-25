import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { ArtemisTab, ArtemisTabType } from '@shared/types';

interface TabContextValue {
  tabs: ArtemisTab[];
  activeTabId: string;
  activeTab: ArtemisTab | undefined;
  selectTab: (id: string) => void;
  closeTab: (id: string) => Promise<boolean>;
  openTab: (tab: Omit<ArtemisTab, 'id'> & { id?: string }) => string;
  openOrFocusTab: (type: ArtemisTabType, defaultOptions?: Partial<ArtemisTab>) => string;
  openDocumentTab: (libraryItemId: string, title: string) => string;
  openCustomerTab: (customerId: string, name: string) => string;
  openVehicleTab: (vehicleId: string, title: string) => string;
  openWorkOrderTab: (workOrderId: string, title: string) => string;
  openScheduleTab: () => string;
  openScheduleEventTab: (eventId: string, title: string) => string;
  openEstimateTab: (estimateId: string, title: string) => string;
  openInvoiceTab: (invoiceId: string, title: string) => string;
  updateTab: (id: string, updates: Partial<ArtemisTab>) => void;
  syncDocumentTitle: (libraryItemId: string, newTitle: string) => void;
  syncCustomerTitle: (customerId: string, newName: string) => void;
  syncVehicleTitle: (vehicleId: string, newTitle: string) => void;
  syncWorkOrderTitle: (workOrderId: string, newTitle: string) => void;
  syncScheduleEventTitle: (eventId: string, newTitle: string) => void;
  syncEstimateTitle: (estimateId: string, newTitle: string) => void;
  syncInvoiceTitle: (invoiceId: string, newTitle: string) => void;
  registerBeforeClose: (tabId: string, handler: () => Promise<boolean>) => () => void;
}

const TabContext = createContext<TabContextValue | null>(null);

const DEFAULT_HOME_TAB: ArtemisTab = {
  id: 'tab-home',
  type: 'home',
  title: 'Artemis Home',
  icon: 'home',
  closable: false,
  metadata: {
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  },
};

const SINGLETON_TAB_TYPES: Set<ArtemisTabType> = new Set([
  'home',
  'library',
  'automotive',
  'schedule',
]);

export const TabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tabs, setTabs] = useState<ArtemisTab[]>([DEFAULT_HOME_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>(DEFAULT_HOME_TAB.id);
  const beforeCloseHandlersRef = useRef<Map<string, () => Promise<boolean>>>(new Map());

  const registerBeforeClose = useCallback(
    (tabId: string, handler: () => Promise<boolean>) => {
      beforeCloseHandlersRef.current.set(tabId, handler);
      return () => {
        beforeCloseHandlersRef.current.delete(tabId);
      };
    },
    []
  );

  const selectTab = useCallback((id: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === id
          ? { ...tab, metadata: { ...tab.metadata, lastActiveAt: Date.now() } }
          : tab
      )
    );
    setActiveTabId(id);
  }, []);

  const closeTab = useCallback(
    async (id: string): Promise<boolean> => {
      const tabToClose = tabs.find((t) => t.id === id);
      if (!tabToClose || !tabToClose.closable) {
        return false;
      }

      // Check if there is a registered beforeClose handler (e.g. for flushing unsaved doc edits)
      const beforeCloseHandler = beforeCloseHandlersRef.current.get(id);
      if (beforeCloseHandler) {
        try {
          const canClose = await beforeCloseHandler();
          if (!canClose) {
            return false;
          }
        } catch (e) {
          console.error(`beforeClose handler failed for tab ${id}:`, e);
          return false;
        }
      }

      beforeCloseHandlersRef.current.delete(id);

      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.id !== id);

        if (activeTabId === id) {
          const closingIndex = prev.findIndex((t) => t.id === id);
          const nextTab = newTabs[closingIndex] || newTabs[closingIndex - 1] || newTabs[0];
          if (nextTab) {
            setActiveTabId(nextTab.id);
          }
        }

        return newTabs;
      });

      return true;
    },
    [tabs, activeTabId]
  );

  const updateTab = useCallback((id: string, updates: Partial<ArtemisTab>) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, ...updates } : tab))
    );
  }, []);

  const openTab = useCallback((tabOptions: Omit<ArtemisTab, 'id'> & { id?: string }) => {
    // Deduplication by tab.type + tab.resourceId (for documents, customers, vehicles, work orders, schedule events)
    if (tabOptions.resourceId) {
      const existingResourceTab = tabs.find(
        (t) => t.type === tabOptions.type && t.resourceId === tabOptions.resourceId
      );
      if (existingResourceTab) {
        selectTab(existingResourceTab.id);
        return existingResourceTab.id;
      }
    }

    // Deduplication for singletons (Home, Library, Automotive Hub, Schedule)
    if (SINGLETON_TAB_TYPES.has(tabOptions.type)) {
      const existing = tabs.find((t) => t.type === tabOptions.type);
      if (existing) {
        selectTab(existing.id);
        return existing.id;
      }
    }

    const id =
      tabOptions.id ||
      `tab-${tabOptions.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newTab: ArtemisTab = {
      ...tabOptions,
      id,
      closable: tabOptions.closable ?? true,
      metadata: {
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        ...tabOptions.metadata,
      },
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
    return id;
  }, [tabs, selectTab]);

  const openOrFocusTab = useCallback((type: ArtemisTabType, defaultOptions?: Partial<ArtemisTab>) => {
    const existing = tabs.find((t) => t.type === type);
    if (existing) {
      selectTab(existing.id);
      return existing.id;
    }

    let title = 'New Tab';
    let icon = 'file';
    let closable = true;

    switch (type) {
      case 'home':
        title = 'Artemis Home';
        icon = 'home';
        closable = false;
        break;
      case 'library':
        title = 'Library';
        icon = 'library';
        closable = true;
        break;
      case 'automotive':
        title = 'Automotive';
        icon = 'wrench';
        closable = true;
        break;
      case 'schedule':
        title = 'Schedule & Calendar';
        icon = 'calendar';
        closable = true;
        break;
      case 'web':
        title = 'Browser';
        icon = 'globe';
        break;
      case 'document':
        title = 'Document';
        icon = 'file-text';
        break;
      case 'code':
        title = 'Code Editor';
        icon = 'code';
        break;
      case 'cad':
        title = 'CAD Studio';
        icon = 'box';
        break;
      case 'pcb':
        title = 'PCB Designer';
        icon = 'cpu';
        break;
      case 'calendar':
        title = 'Schedule & Calendar';
        icon = 'calendar';
        break;
      case 'automotive-work-order':
        title = 'Work Order';
        icon = 'clipboard-list';
        break;
      case 'schedule-event':
        title = 'Schedule Event';
        icon = 'calendar';
        break;
      default:
        title = 'Artemis View';
        icon = 'layout';
        break;
    }

    return openTab({
      type,
      title: defaultOptions?.title || title,
      icon: defaultOptions?.icon || icon,
      closable: defaultOptions?.closable ?? closable,
      state: defaultOptions?.state,
      metadata: defaultOptions?.metadata,
    });
  }, [tabs, openTab, selectTab]);

  const openDocumentTab = useCallback(
    (libraryItemId: string, title: string) => {
      const existing = tabs.find(
        (t) => t.type === 'document' && t.resourceId === libraryItemId
      );
      if (existing) {
        selectTab(existing.id);
        return existing.id;
      }

      return openTab({
        type: 'document',
        resourceId: libraryItemId,
        title: title || 'Untitled Document',
        icon: 'file-text',
        closable: true,
      });
    },
    [tabs, openTab, selectTab]
  );

  const openCustomerTab = useCallback(
    (customerId: string, name: string) => {
      const existing = tabs.find(
        (t) => t.type === 'automotive-customer' && t.resourceId === customerId
      );
      if (existing) {
        selectTab(existing.id);
        return existing.id;
      }

      return openTab({
        type: 'automotive-customer',
        resourceId: customerId,
        title: name || 'Customer',
        icon: 'user',
        closable: true,
      });
    },
    [tabs, openTab, selectTab]
  );

  const openVehicleTab = useCallback(
    (vehicleId: string, title: string) => {
      const existing = tabs.find(
        (t) => t.type === 'automotive-vehicle' && t.resourceId === vehicleId
      );
      if (existing) {
        selectTab(existing.id);
        return existing.id;
      }

      return openTab({
        type: 'automotive-vehicle',
        resourceId: vehicleId,
        title: title || 'Vehicle',
        icon: 'car',
        closable: true,
      });
    },
    [tabs, openTab, selectTab]
  );

  const openWorkOrderTab = useCallback(
    (workOrderId: string, title: string) => {
      const existing = tabs.find(
        (t) => t.type === 'automotive-work-order' && t.resourceId === workOrderId
      );
      if (existing) {
        selectTab(existing.id);
        return existing.id;
      }

      return openTab({
        type: 'automotive-work-order',
        resourceId: workOrderId,
        title: title || 'Work Order',
        icon: 'clipboard-list',
        closable: true,
      });
    },
    [tabs, openTab, selectTab]
  );

  const openScheduleTab = useCallback(() => {
    return openOrFocusTab('schedule');
  }, [openOrFocusTab]);

  const openScheduleEventTab = useCallback(
    (eventId: string, title: string) => {
      const existing = tabs.find(
        (t) => t.type === 'schedule-event' && t.resourceId === eventId
      );
      if (existing) {
        selectTab(existing.id);
        return existing.id;
      }

      return openTab({
        type: 'schedule-event',
        resourceId: eventId,
        title: title || 'Schedule Event',
        icon: 'calendar',
        closable: true,
      });
    },
    [tabs, openTab, selectTab]
  );

  const openEstimateTab = useCallback(
    (estimateId: string, title: string) => {
      const existing = tabs.find(
        (t) => t.type === 'automotive-estimate' && t.resourceId === estimateId
      );
      if (existing) {
        selectTab(existing.id);
        return existing.id;
      }

      return openTab({
        type: 'automotive-estimate',
        resourceId: estimateId,
        title: title || 'Estimate',
        icon: 'calculator',
        closable: true,
      });
    },
    [tabs, openTab, selectTab]
  );

  const openInvoiceTab = useCallback(
    (invoiceId: string, title: string) => {
      const existing = tabs.find(
        (t) => t.type === 'automotive-invoice' && t.resourceId === invoiceId
      );
      if (existing) {
        selectTab(existing.id);
        return existing.id;
      }

      return openTab({
        type: 'automotive-invoice',
        resourceId: invoiceId,
        title: title || 'Invoice',
        icon: 'receipt',
        closable: true,
      });
    },
    [tabs, openTab, selectTab]
  );

  const syncDocumentTitle = useCallback((libraryItemId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.type === 'document' && tab.resourceId === libraryItemId
          ? { ...tab, title: newTitle }
          : tab
      )
    );
  }, []);

  const syncCustomerTitle = useCallback((customerId: string, newName: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.type === 'automotive-customer' && tab.resourceId === customerId
          ? { ...tab, title: newName }
          : tab
      )
    );
  }, []);

  const syncVehicleTitle = useCallback((vehicleId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.type === 'automotive-vehicle' && tab.resourceId === vehicleId
          ? { ...tab, title: newTitle }
          : tab
      )
    );
  }, []);

  const syncWorkOrderTitle = useCallback((workOrderId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.type === 'automotive-work-order' && tab.resourceId === workOrderId
          ? { ...tab, title: newTitle }
          : tab
      )
    );
  }, []);

  const syncScheduleEventTitle = useCallback((eventId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.type === 'schedule-event' && tab.resourceId === eventId
          ? { ...tab, title: newTitle }
          : tab
      )
    );
  }, []);

  const syncEstimateTitle = useCallback((estimateId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.type === 'automotive-estimate' && tab.resourceId === estimateId
          ? { ...tab, title: newTitle }
          : tab
      )
    );
  }, []);

  const syncInvoiceTitle = useCallback((invoiceId: string, newTitle: string) => {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.type === 'automotive-invoice' && tab.resourceId === invoiceId
          ? { ...tab, title: newTitle }
          : tab
      )
    );
  }, []);

  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId), [tabs, activeTabId]);

  const value = useMemo(
    () => ({
      tabs,
      activeTabId,
      activeTab,
      selectTab,
      closeTab,
      openTab,
      openOrFocusTab,
      openDocumentTab,
      openCustomerTab,
      openVehicleTab,
      openWorkOrderTab,
      openScheduleTab,
      openScheduleEventTab,
      openEstimateTab,
      openInvoiceTab,
      updateTab,
      syncDocumentTitle,
      syncCustomerTitle,
      syncVehicleTitle,
      syncWorkOrderTitle,
      syncScheduleEventTitle,
      syncEstimateTitle,
      syncInvoiceTitle,
      registerBeforeClose,
    }),
    [
      tabs,
      activeTabId,
      activeTab,
      selectTab,
      closeTab,
      openTab,
      openOrFocusTab,
      openDocumentTab,
      openCustomerTab,
      openVehicleTab,
      openWorkOrderTab,
      openScheduleTab,
      openScheduleEventTab,
      openEstimateTab,
      openInvoiceTab,
      updateTab,
      syncDocumentTitle,
      syncCustomerTitle,
      syncVehicleTitle,
      syncWorkOrderTitle,
      syncScheduleEventTitle,
      syncEstimateTitle,
      syncInvoiceTitle,
      registerBeforeClose,
    ]
  );

  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
};

export const useTabs = (): TabContextValue => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabProvider');
  }
  return context;
};
