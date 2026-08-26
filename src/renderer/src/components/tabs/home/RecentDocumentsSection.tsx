import React, { useState } from 'react';
import {
  FileText,
  ArrowUpRight,
  Plus,
  Clock,
  Folder,
  AlertCircle,
} from 'lucide-react';
import { useLibrary } from '../../../state/LibraryContext';
import { useTabs } from '../../../state/TabContext';

export const RecentDocumentsSection: React.FC = () => {
  const { items, createDocument, error } = useLibrary();
  const { openDocumentTab, openTab } = useTabs();

  const [isCreating, setIsCreating] = useState(false);

  // Filter for non-deleted documents and sort by updatedAt desc
  const documentItems = items
    .filter((it) => it.type === 'document' && !it.isDeleted)
    .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

  const recentDocs = documentItems.slice(0, 5);

  // Helper to resolve parent folder path
  const getFolderPath = (parentId: string | null): string => {
    if (!parentId) return 'Root';
    const folder = items.find((i) => i.id === parentId);
    return folder ? folder.name : 'Library';
  };

  const handleCreateNewDocument = async () => {
    try {
      setIsCreating(true);
      const newDoc = await createDocument('Untitled Document', null);
      openDocumentTab(newDoc.id, newDoc.name);
    } catch (e) {
      console.error('Failed to create document:', e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-artemis-900 border border-zinc-800 rounded-2xl p-5 shadow-lg flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-silver-500/10 border border-silver-500/20 text-silver-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-zinc-200">
              Recent Documents
            </h3>
            <span className="text-[11px] text-zinc-500 font-mono">
              {documentItems.length} {documentItems.length === 1 ? 'document' : 'documents'} in library
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCreateNewDocument}
            disabled={isCreating}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors disabled:opacity-50"
            title="Create New Document"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => openTab({ id: 'library', type: 'library', title: 'Library', closable: true })}
            className="text-xs font-bold text-silver-400 hover:text-silver-300 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-silver-500/10"
          >
            <span>Open Library</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="my-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Failed to load library: {error}</span>
        </div>
      )}

      {/* List */}
      <div className="mt-3 space-y-2 flex-1 overflow-y-auto min-h-[160px] pr-1">
        {recentDocs.length === 0 ? (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 rounded-xl border border-dashed border-zinc-800">
            <FileText className="w-6 h-6 text-zinc-600 mb-1.5" />
            <div className="text-xs font-semibold text-zinc-400">No documents in library</div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Create structured contracts, procedures, and service notes.
            </p>
            <button
              type="button"
              onClick={handleCreateNewDocument}
              className="mt-3 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 border border-zinc-700 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New Document
            </button>
          </div>
        ) : (
          recentDocs.map((doc) => {
            const folderPath = getFolderPath(doc.parentId);
            const timeFormatted = new Date(doc.updatedAt || doc.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={doc.id}
                onClick={() => openDocumentTab(doc.id, doc.name)}
                className="group p-3 rounded-xl bg-artemis-950/60 hover:bg-artemis-950 border border-zinc-800/80 hover:border-silver-500/30 transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-zinc-200 group-hover:text-silver-300 transition-colors truncate">
                    {doc.name}
                  </h4>

                  <div className="mt-1 flex items-center gap-3 text-[10px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Folder className="w-3 h-3 text-zinc-500" />
                      {folderPath}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-zinc-500">
                      <Clock className="w-3 h-3 text-zinc-600" />
                      {timeFormatted}
                    </span>
                  </div>
                </div>

                <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-silver-400 transition-colors shrink-0" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
