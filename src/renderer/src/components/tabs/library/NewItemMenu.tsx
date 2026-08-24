import React, { useState, useRef, useEffect } from 'react';
import { Plus, FolderPlus, FileText, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface NewItemMenuProps {
  onOpenCreateFolder: () => void;
  onOpenCreateDocument: () => void;
}

export const NewItemMenu: React.FC<NewItemMenuProps> = ({
  onOpenCreateFolder,
  onOpenCreateDocument,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectFolder = () => {
    setIsOpen(false);
    onOpenCreateFolder();
  };

  const handleSelectDocument = () => {
    setIsOpen(false);
    onOpenCreateDocument();
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-artemis-accent hover:bg-artemis-accent-hover text-artemis-950 font-semibold text-xs transition-colors shadow-sm shadow-cyan-500/20 active:scale-95 shrink-0"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>New</span>
        <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform duration-150', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-48 rounded-xl bg-artemis-900 border border-slate-700/80 shadow-2xl py-1 z-30 animate-fadeIn">
          <button
            type="button"
            onClick={handleSelectFolder}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-200 hover:text-slate-100 hover:bg-slate-800/80 transition-colors text-left font-medium"
          >
            <FolderPlus className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Folder</span>
          </button>

          <button
            type="button"
            onClick={handleSelectDocument}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-200 hover:text-slate-100 hover:bg-slate-800/80 transition-colors text-left font-medium"
          >
            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Document</span>
          </button>
        </div>
      )}
    </div>
  );
};
