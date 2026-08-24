import React, { useRef } from 'react';
import { Plus } from 'lucide-react';
import { useTabs } from '../../state/TabContext';
import { useLauncher } from '../../state/LauncherContext';
import { TabItem } from './TabItem';

export const TabBar: React.FC = () => {
  const { tabs, activeTabId, selectTab, closeTab } = useTabs();
  const { toggleLauncher } = useLauncher();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="flex items-end flex-1 min-w-0 h-10 px-1 gap-1 overflow-hidden">
      {/* Scrollable Tabs Container */}
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className="flex items-end gap-1 overflow-x-auto overflow-y-hidden no-scrollbar flex-1 min-w-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={selectTab}
            onClose={closeTab}
          />
        ))}
      </div>

      {/* New Tab (+) Button */}
      <button
        type="button"
        onClick={toggleLauncher}
        title="New Tab / App Launcher (Ctrl+T)"
        className="no-drag flex items-center justify-center w-7 h-7 mb-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 active:bg-slate-700/80 transition-colors shrink-0"
        aria-label="New Tab"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
