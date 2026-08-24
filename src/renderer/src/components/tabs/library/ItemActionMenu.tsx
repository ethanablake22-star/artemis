import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, FolderOpen } from 'lucide-react';
import type { LibraryItem } from '@shared/libraryTypes';

interface ItemActionMenuProps {
  item: LibraryItem;
  onRename: (item: LibraryItem) => void;
  onDelete: (item: LibraryItem) => void;
  onOpen?: (item: LibraryItem) => void;
}

export const ItemActionMenu: React.FC<ItemActionMenuProps> = ({
  item,
  onRename,
  onDelete,
  onOpen,
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

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors"
        title="More actions"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-36 rounded-xl bg-artemis-900 border border-slate-700/80 shadow-2xl py-1 z-30 animate-fadeIn">
          {item.type === 'folder' && onOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onOpen(item);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:text-slate-100 hover:bg-slate-800 transition-colors text-left"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Open</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onRename(item);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:text-slate-100 hover:bg-slate-800 transition-colors text-left"
          >
            <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Rename</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDelete(item);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};
