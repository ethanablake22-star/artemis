import React from 'react';
import {
  Home,
  FolderOpen,
  Globe,
  FileText,
  Table,
  Code2,
  Box,
  Cpu,
  Calendar,
  Wrench,
  User,
  Car,
  ClipboardList,
  Calculator,
  Receipt,
  File,
  X,
} from 'lucide-react';
import type { ArtemisTab } from '@shared/types';
import clsx from 'clsx';

interface TabItemProps {
  tab: ArtemisTab;
  isActive: boolean;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

const renderTabIcon = (type: ArtemisTab['type']) => {
  const iconProps = { className: 'w-4 h-4 shrink-0' };

  switch (type) {
    case 'home':
      return <Home {...iconProps} className="w-4 h-4 shrink-0 text-artemis-accent" />;
    case 'library':
      return <FolderOpen {...iconProps} className="w-4 h-4 shrink-0 text-amber-400" />;
    case 'web':
      return <Globe {...iconProps} className="w-4 h-4 shrink-0 text-blue-400" />;
    case 'document':
      return <FileText {...iconProps} className="w-4 h-4 shrink-0 text-indigo-400" />;
    case 'spreadsheet':
      return <Table {...iconProps} className="w-4 h-4 shrink-0 text-emerald-400" />;
    case 'code':
      return <Code2 {...iconProps} className="w-4 h-4 shrink-0 text-cyan-400" />;
    case 'cad':
      return <Box {...iconProps} className="w-4 h-4 shrink-0 text-purple-400" />;
    case 'pcb':
      return <Cpu {...iconProps} className="w-4 h-4 shrink-0 text-green-400" />;
    case 'calendar':
    case 'schedule':
    case 'schedule-event':
      return <Calendar {...iconProps} className="w-4 h-4 shrink-0 text-rose-400" />;
    case 'automotive':
      return <Wrench {...iconProps} className="w-4 h-4 shrink-0 text-orange-400" />;
    case 'automotive-customer':
      return <User {...iconProps} className="w-4 h-4 shrink-0 text-cyan-400" />;
    case 'automotive-vehicle':
      return <Car {...iconProps} className="w-4 h-4 shrink-0 text-indigo-400" />;
    case 'automotive-work-order':
      return <ClipboardList {...iconProps} className="w-4 h-4 shrink-0 text-emerald-400" />;
    case 'automotive-estimate':
      return <Calculator {...iconProps} className="w-4 h-4 shrink-0 text-teal-400" />;
    case 'automotive-invoice':
      return <Receipt {...iconProps} className="w-4 h-4 shrink-0 text-amber-400" />;
    default:
      return <File {...iconProps} className="w-4 h-4 shrink-0 text-slate-400" />;
  }
};

export const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onSelect, onClose }) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(tab.id);
  };

  const handleAuxClick = (e: React.MouseEvent) => {
    // Middle click closes closable tabs
    if (e.button === 1 && tab.closable) {
      e.preventDefault();
      onClose(tab.id);
    }
  };

  return (
    <div
      role="tab"
      aria-selected={isActive}
      onClick={() => onSelect(tab.id)}
      onAuxClick={handleAuxClick}
      className={clsx(
        'group relative flex items-center gap-2 h-9 px-3.5 max-w-[240px] min-w-[130px] rounded-t-lg text-xs font-medium cursor-pointer transition-all duration-150 select-none border-t border-x',
        isActive
          ? 'bg-artemis-900 text-slate-100 border-slate-700/60 shadow-sm tab-active-glow z-10'
          : 'bg-artemis-950/60 hover:bg-artemis-900/50 text-slate-400 hover:text-slate-200 border-transparent hover:border-slate-800/60'
      )}
    >
      {/* Tab Icon */}
      {renderTabIcon(tab.type)}

      {/* Tab Title */}
      <span className="truncate flex-1 text-left tracking-wide">
        {tab.title}
      </span>

      {/* Unsaved indicator */}
      {tab.metadata?.unsavedChanges && (
        <span className="w-2 h-2 rounded-full bg-artemis-accent shrink-0 animate-pulse" />
      )}

      {/* Close Button (Hidden if not closable) */}
      {tab.closable && (
        <button
          type="button"
          onClick={handleClose}
          aria-label={`Close ${tab.title}`}
          className={clsx(
            'p-0.5 rounded hover:bg-slate-700/70 text-slate-400 hover:text-slate-100 transition-colors shrink-0',
            isActive ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover:opacity-70 hover:opacity-100'
          )}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Subtle bottom separator when tab is inactive */}
      {!isActive && (
        <div className="absolute right-0 top-2 bottom-2 w-px bg-slate-800/80 pointer-events-none" />
      )}
    </div>
  );
};
