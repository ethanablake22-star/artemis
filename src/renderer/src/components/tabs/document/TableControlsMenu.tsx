import React, { useState, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Table as TableIcon,
  Plus,
  Trash2,
  Columns,
  Rows,
  ToggleLeft,
} from 'lucide-react';
import clsx from 'clsx';

interface TableControlsMenuProps {
  editor: Editor | null;
}

export const TableControlsMenu: React.FC<TableControlsMenuProps> = ({ editor }) => {
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

  if (!editor) return null;

  const isTableActive = editor.isActive('table');

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Table Operations"
        className={clsx(
          'p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium',
          isTableActive
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
        )}
      >
        <TableIcon className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-52 rounded-xl bg-artemis-900 border border-zinc-700/80 shadow-2xl py-1.5 z-40 animate-fadeIn">
          {!isTableActive ? (
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-200 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-left"
            >
              <Plus className="w-3.5 h-3.5 text-artemis-accent" />
              <span>Insert 3×3 Table</span>
            </button>
          ) : (
            <>
              <div className="px-3 py-1 text-[10px] uppercase font-mono text-zinc-500 font-bold">
                Table Options
              </div>

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().addRowBefore().run();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-200 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-left"
              >
                <Rows className="w-3.5 h-3.5 text-zinc-400" />
                <span>Add Row Above</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().addRowAfter().run();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-200 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-left"
              >
                <Rows className="w-3.5 h-3.5 text-zinc-400" />
                <span>Add Row Below</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().deleteRow().run();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Row</span>
              </button>

              <div className="w-full h-px bg-zinc-800 my-1" />

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().addColumnBefore().run();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-200 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-left"
              >
                <Columns className="w-3.5 h-3.5 text-zinc-400" />
                <span>Add Column Left</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().addColumnAfter().run();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-200 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-left"
              >
                <Columns className="w-3.5 h-3.5 text-zinc-400" />
                <span>Add Column Right</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().deleteColumn().run();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Column</span>
              </button>

              <div className="w-full h-px bg-zinc-800 my-1" />

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().toggleHeaderRow().run();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-200 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-left"
              >
                <ToggleLeft className="w-3.5 h-3.5 text-zinc-400" />
                <span>Toggle Header Row</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  editor.chain().focus().deleteTable().run();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Table</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
