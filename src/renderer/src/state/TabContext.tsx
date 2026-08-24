import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ArtemisTab, ArtemisTabType } from '@shared/types';

interface TabContextValue {
  tabs: ArtemisTab[];
  activeTabId: string;
  activeTab: ArtemisTab | undefined;
  selectTab: (id: string) => void;
  closeTab: (id: string) => void;
  openTab: (tab: Omit<ArtemisTab, 'id'> & { id?: string }) => string;
  openOrFocusTab: (type: ArtemisTabType, defaultOptions?: Partial<ArtemisTab>) => string;
  updateTab: (id: string, updates: Partial<ArtemisTab>) => void;
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

const SINGLETON_TAB_TYPES: Set<ArtemisTabType> = new Set(['home', 'library']);

export const TabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tabs, setTabs] = useState<ArtemisTab[]>([DEFAULT_HOME_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>(DEFAULT_HOME_TAB.id);

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

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const tabToClose = prev.find((t) => t.id === id);
      if (!tabToClose || !tabToClose.closable) {
        return prev;
      }

      const newTabs = prev.filter((t) => t.id !== id);
      
      // If closing the active tab, switch to the nearest adjacent tab or Home
      if (activeTabId === id) {
        const closingIndex = prev.findIndex((t) => t.id === id);
        const nextTab = newTabs[closingIndex] || newTabs[closingIndex - 1] || newTabs[0];
        if (nextTab) {
          setActiveTabId(nextTab.id);
        }
      }

      return newTabs;
    });
  }, [activeTabId]);

  const updateTab = useCallback((id: string, updates: Partial<ArtemisTab>) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, ...updates } : tab))
    );
  }, []);

  const openTab = useCallback((tabOptions: Omit<ArtemisTab, 'id'> & { id?: string }) => {
    const id = tabOptions.id || `tab-${tabOptions.type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Deduplication check for singletons
    if (SINGLETON_TAB_TYPES.has(tabOptions.type)) {
      const existing = tabs.find((t) => t.type === tabOptions.type);
      if (existing) {
        selectTab(existing.id);
        return existing.id;
      }
    }

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
    // Check if singleton or already exists
    const existing = tabs.find((t) => t.type === type);
    if (existing) {
      selectTab(existing.id);
      return existing.id;
    }

    // Default configuration based on tab type
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
        title = 'Calendar & Schedule';
        icon = 'calendar';
        break;
      case 'automotive':
        title = 'Automotive Service';
        icon = 'wrench';
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
      updateTab,
    }),
    [tabs, activeTabId, activeTab, selectTab, closeTab, openTab, openOrFocusTab, updateTab]
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
