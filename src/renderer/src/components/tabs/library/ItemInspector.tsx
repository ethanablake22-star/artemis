import React from 'react';
import {
  Info,
  Folder,
  FolderOpen,
  FileText,
  Calendar,
  Clock,
  Fingerprint,
  Layers,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useLibrary } from '../../../state/LibraryContext';
import type { LibraryItem } from '@shared/libraryTypes';

interface ItemInspectorProps {
  onRename: (item: LibraryItem) => void;
  onDelete: (item: LibraryItem) => void;
  onOpenDocument?: (item: LibraryItem) => void;
}

export const ItemInspector: React.FC<ItemInspectorProps> = ({
  onRename,
  onDelete,
  onOpenDocument,
}) => {
  const { selectedItem, items, navigateToFolder } = useLibrary();

  if (!selectedItem) {
    return (
      <div className="w-72 border-l border-slate-800 bg-artemis-950/60 p-5 flex flex-col items-center justify-center text-center shrink-0 select-none">
        <div className="p-3 rounded-full bg-slate-800/40 text-slate-500 mb-2">
          <Info className="w-5 h-5" />
        </div>
        <div className="text-xs font-semibold text-slate-400">No Item Selected</div>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
          Select any folder or document to inspect its metadata and properties.
        </p>
      </div>
    );
  }

  // Find parent folder name
  const parentFolder = selectedItem.parentId
    ? items.find((it) => it.id === selectedItem.parentId)
    : null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getIcon = () => {
    if (selectedItem.type === 'folder') {
      return <Folder className="w-8 h-8 text-amber-400" />;
    }
    return <FileText className="w-8 h-8 text-indigo-400" />;
  };

  return (
    <div className="w-72 border-l border-slate-800 bg-artemis-950/60 p-5 flex flex-col shrink-0 overflow-y-auto select-none">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <Info className="w-4 h-4 text-artemis-accent" />
          Inspector
        </div>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          {selectedItem.type}
        </span>
      </div>

      {/* Item Visual Header */}
      <div className="h-28 rounded-xl border border-slate-800 bg-artemis-900 flex flex-col items-center justify-center p-3 text-center mb-4">
        {getIcon()}
        <span className="text-xs font-semibold text-slate-200 mt-2 truncate w-full px-2">
          {selectedItem.name}
        </span>
      </div>

      {/* Metadata Property Table */}
      <div className="space-y-3.5 text-xs flex-1">
        {/* Name */}
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-500">Name</div>
          <div className="text-slate-200 font-medium break-all mt-0.5">
            {selectedItem.name}
          </div>
        </div>

        {/* Stable UUID */}
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
            <Fingerprint className="w-3 h-3 text-slate-500" />
            Stable Internal UUID
          </div>
          <div className="text-[11px] font-mono text-cyan-400/90 break-all mt-0.5 bg-artemis-900/80 p-1.5 rounded border border-slate-800/80">
            {selectedItem.id}
          </div>
        </div>

        {/* Parent Folder */}
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" />
            Parent Location
          </div>
          <div className="text-slate-300 font-mono text-[11px] mt-0.5">
            {parentFolder ? parentFolder.name : 'Root (/) '}
          </div>
        </div>

        {/* Timestamps */}
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-500" />
            Created Timestamp
          </div>
          <div className="text-slate-300 font-mono text-[11px] mt-0.5">
            {formatDate(selectedItem.createdAt)}
          </div>
        </div>

        <div>
          <div className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            Last Updated
          </div>
          <div className="text-slate-300 font-mono text-[11px] mt-0.5">
            {formatDate(selectedItem.updatedAt)}
          </div>
        </div>

        {/* Description if present */}
        {selectedItem.metadata?.description && (
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-500">Description</div>
            <div className="text-slate-400 text-xs mt-0.5 leading-relaxed">
              {String(selectedItem.metadata.description)}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-slate-800 space-y-2">
        {selectedItem.type === 'folder' && (
          <button
            type="button"
            onClick={() => navigateToFolder(selectedItem.id)}
            className="w-full py-1.5 px-3 rounded-lg bg-artemis-accent/15 hover:bg-artemis-accent/25 text-artemis-accent border border-artemis-accent/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Open Folder
          </button>
        )}

        {selectedItem.type === 'document' && onOpenDocument && (
          <button
            type="button"
            onClick={() => onOpenDocument(selectedItem)}
            className="w-full py-1.5 px-3 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Open in Docs
          </button>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onRename(selectedItem)}
            className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-700/50"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Rename
          </button>

          <button
            type="button"
            onClick={() => onDelete(selectedItem)}
            className="py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
