import React, { useState, useEffect, useRef } from 'react';
import { Edit2, X } from 'lucide-react';
import type { LibraryItem } from '@shared/libraryTypes';

interface RenameModalProps {
  isOpen: boolean;
  item: LibraryItem | null;
  onClose: () => void;
  onSubmit: (id: string, newName: string) => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  item,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && item) {
      setName(item.name);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Select base name before extension if document
          const dotIndex = item.name.lastIndexOf('.');
          if (dotIndex > 0 && item.type !== 'folder') {
            inputRef.current.setSelectionRange(0, dotIndex);
          } else {
            inputRef.current.select();
          }
        }
      }, 50);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== item.name) {
      onSubmit(item.id, name.trim());
      onClose();
    } else if (name.trim() === item.name) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-artemis-900 border border-zinc-700/80 rounded-xl shadow-2xl p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-silver-500/10 border border-silver-500/20 text-silver-400">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Rename {item.type === 'folder' ? 'Folder' : 'Item'}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-[280px]">
                Original: <span className="text-zinc-300 font-medium">{item.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              New Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter new name..."
              className="w-full bg-artemis-950 border border-zinc-700 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-artemis-accent focus:ring-1 focus:ring-artemis-accent"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-artemis-accent hover:bg-artemis-accent-hover text-artemis-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Name
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
