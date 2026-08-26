import React, { useState } from 'react';
import {
  Folder,
  FileText,
  Search,
  Grid,
  List,
  FolderPlus,
  FilePlus,
} from 'lucide-react';
import { useLibrary } from '../../../state/LibraryContext';
import { BreadcrumbNav } from './BreadcrumbNav';
import { NewItemMenu } from './NewItemMenu';
import { FolderTreeView } from './FolderTreeView';
import { ItemInspector } from './ItemInspector';
import { ItemActionMenu } from './ItemActionMenu';
import { CreateFolderModal } from './CreateFolderModal';
import { CreateDocumentModal } from './CreateDocumentModal';
import { RenameModal } from './RenameModal';
import type { LibraryItem } from '@shared/libraryTypes';
import clsx from 'clsx';

import { useTabs } from '../../../state/TabContext';

export const LibraryTab: React.FC = () => {
  const { openDocumentTab } = useTabs();
  const {
    filteredContents,
    currentFolder,
    selectedItemId,
    viewMode,
    searchQuery,
    error,
    setSearchQuery,
    setViewMode,
    setSelectedItemId,
    navigateToFolder,
    createFolder,
    createDocument,
    renameItem,
    deleteItem,
  } = useLibrary();

  // Modals state
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isCreateDocumentOpen, setIsCreateDocumentOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<LibraryItem | null>(null);

  const handleOpenFolder = (folder: LibraryItem) => {
    navigateToFolder(folder.id);
  };

  const handleOpenDocument = (doc: LibraryItem) => {
    openDocumentTab(doc.id, doc.name);
  };

  const handleItemClick = (item: LibraryItem) => {
    setSelectedItemId(item.id);
  };

  const handleItemDoubleClick = (item: LibraryItem) => {
    if (item.type === 'folder') {
      navigateToFolder(item.id);
    } else if (item.type === 'document') {
      openDocumentTab(item.id, item.name);
    }
  };

  const handleRename = (item: LibraryItem) => {
    setItemToRename(item);
  };

  const handleDelete = async (item: LibraryItem) => {
    const isFolder = item.type === 'folder';
    const message = isFolder
      ? `Are you sure you want to delete the folder "${item.name}" and all its contents?`
      : `Are you sure you want to delete "${item.name}"?`;
    
    if (window.confirm(message)) {
      await deleteItem(item.id);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="flex h-full w-full bg-artemis-900 text-zinc-100 overflow-hidden">
      {/* Left Sidebar: Folder Directory Tree */}
      <aside className="w-64 border-r border-zinc-800 bg-artemis-950/70 flex flex-col shrink-0 select-none p-3">
        <FolderTreeView />
      </aside>

      {/* Main File Browser Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-artemis-900 overflow-hidden">
        {/* Top Navigation & Action Bar */}
        <div className="h-14 border-b border-zinc-800 px-5 flex items-center justify-between gap-4 shrink-0 bg-artemis-950/40">
          {/* Breadcrumbs */}
          <BreadcrumbNav />

          {/* Actions: Search, View Switcher, + New */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter library items..."
                className="w-48 sm:w-56 bg-artemis-950 border border-zinc-700/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-artemis-accent"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-artemis-950 border border-zinc-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'grid'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={clsx(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'list'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* + New Button Menu */}
            <NewItemMenu
              onOpenCreateFolder={() => setIsCreateFolderOpen(true)}
              onOpenCreateDocument={() => setIsCreateDocumentOpen(true)}
            />
          </div>
        </div>

        {/* Content Viewport + Inspector */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Grid / List Viewport */}
          <div className="flex-1 overflow-y-auto p-5">
            {/* Error Banner */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold">Library Error:</span> {error}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredContents.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none">
                <div className="p-4 rounded-2xl bg-artemis-950 border border-zinc-800 mb-3 shadow-lg">
                  <FolderPlus className="w-8 h-8 text-zinc-600" />
                </div>
                <h4 className="text-sm font-semibold text-zinc-300">
                  {searchQuery ? 'No items match your filter' : 'This folder is empty'}
                </h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  {searchQuery
                    ? 'Try adjusting your search terms.'
                    : 'Create a new folder or document using the "+ New" button in the top bar.'}
                </p>
                {!searchQuery && (
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => setIsCreateFolderOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors"
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-bronze-400" />
                      <span>New Folder</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateDocumentOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-artemis-accent/15 hover:bg-artemis-accent/25 text-artemis-accent text-xs font-medium border border-artemis-accent/30 transition-colors"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      <span>New Document</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && filteredContents.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {filteredContents.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  const isFolder = item.type === 'folder';

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      onDoubleClick={() => handleItemDoubleClick(item)}
                      className={clsx(
                        'group relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-36 select-none',
                        isSelected
                          ? 'bg-artemis-850 border-artemis-accent/60 shadow-md ring-1 ring-artemis-accent/30'
                          : 'bg-artemis-950/60 border-zinc-800/80 hover:bg-artemis-850/60 hover:border-zinc-700'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div
                          className={clsx(
                            'p-2 rounded-lg border transition-transform group-hover:scale-105',
                            isFolder
                              ? 'bg-bronze-500/10 border-bronze-500/20 text-bronze-400'
                              : 'bg-silver-500/10 border-silver-500/20 text-silver-400'
                          )}
                        >
                          {isFolder ? (
                            <Folder className="w-5 h-5" />
                          ) : (
                            <FileText className="w-5 h-5" />
                          )}
                        </div>

                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ItemActionMenu
                            item={item}
                            onRename={handleRename}
                            onDelete={handleDelete}
                            onOpen={handleOpenFolder}
                            onOpenDocument={handleOpenDocument}
                          />
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-zinc-200 truncate group-hover:text-artemis-accent transition-colors">
                          {item.name}
                        </h4>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                          <span className="capitalize">{item.type}</span>
                          <span>{formatDate(item.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && filteredContents.length > 0 && (
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-artemis-950/40 select-none">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-artemis-950/80 text-zinc-400 font-medium">
                      <th className="py-2.5 px-4">Name</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Updated</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContents.map((item) => {
                      const isSelected = selectedItemId === item.id;
                      const isFolder = item.type === 'folder';

                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          onDoubleClick={() => handleItemDoubleClick(item)}
                          className={clsx(
                            'border-b border-zinc-800/60 cursor-pointer transition-colors group',
                            isSelected
                              ? 'bg-artemis-accent/10 text-zinc-100 font-medium'
                              : 'hover:bg-zinc-800/40 text-zinc-300'
                          )}
                        >
                          <td className="py-2.5 px-4 flex items-center gap-2.5">
                            {isFolder ? (
                              <Folder className="w-4 h-4 text-bronze-400 shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-silver-400 shrink-0" />
                            )}
                            <span className="truncate">{item.name}</span>
                          </td>
                          <td className="py-2.5 px-4 text-zinc-400 font-mono text-[11px] capitalize">
                            {item.type}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-zinc-400">
                            {formatDate(item.updatedAt)}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <ItemActionMenu
                              item={item}
                              onRename={handleRename}
                              onDelete={handleDelete}
                              onOpen={handleOpenFolder}
                              onOpenDocument={handleOpenDocument}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Inspector Sidebar */}
          <ItemInspector
            onRename={handleRename}
            onDelete={handleDelete}
            onOpenDocument={handleOpenDocument}
          />
        </div>
      </div>

      {/* Modals */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        parentFolderName={currentFolder?.name}
        onClose={() => setIsCreateFolderOpen(false)}
        onSubmit={(name) => createFolder(name)}
      />

      <CreateDocumentModal
        isOpen={isCreateDocumentOpen}
        parentFolderName={currentFolder?.name}
        onClose={() => setIsCreateDocumentOpen(false)}
        onSubmit={(name) => createDocument(name)}
      />

      <RenameModal
        isOpen={itemToRename !== null}
        item={itemToRename}
        onClose={() => setItemToRename(null)}
        onSubmit={(id, newName) => renameItem(id, newName)}
      />
    </div>
  );
};
