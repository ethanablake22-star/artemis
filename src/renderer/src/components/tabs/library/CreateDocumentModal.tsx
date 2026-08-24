import React, { useState, useEffect, useRef } from 'react';
import { FileText, X } from 'lucide-react';

interface CreateDocumentModalProps {
  isOpen: boolean;
  parentFolderName?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export const CreateDocumentModal: React.FC<CreateDocumentModalProps> = ({
  isOpen,
  parentFolderName,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-artemis-900 border border-slate-700/80 rounded-xl shadow-2xl p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Create New Document</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Location: <span className="text-slate-300 font-medium">{parentFolderName || 'Root'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Document Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. system_spec, meeting_notes..."
              className="w-full bg-artemis-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-artemis-accent focus:ring-1 focus:ring-artemis-accent"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              (Will be saved as an Artemis document object in the Library)
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-artemis-accent hover:bg-artemis-accent-hover text-artemis-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
