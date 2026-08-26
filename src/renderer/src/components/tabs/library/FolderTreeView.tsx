import React, { useState } from 'react';
import { Folder, FolderOpen, ChevronDown, ChevronRight, HardDrive } from 'lucide-react';
import { useLibrary } from '../../../state/LibraryContext';
import type { LibraryItem } from '@shared/libraryTypes';
import clsx from 'clsx';

interface TreeNodeProps {
  folder: LibraryItem;
  allItems: LibraryItem[];
  currentFolderId: string | null;
  onSelect: (id: string | null) => void;
  level: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  folder,
  allItems,
  currentFolderId,
  onSelect,
  level,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Find direct child folders
  const childFolders = allItems.filter(
    (it) => it.parentId === folder.id && it.type === 'folder' && !it.isDeleted
  );

  // Count all non-deleted direct items in this folder
  const itemCount = allItems.filter(
    (it) => it.parentId === folder.id && !it.isDeleted
  ).length;

  const isSelected = currentFolderId === folder.id;
  const hasChildren = childFolders.length > 0;

  return (
    <div className="select-none">
      <div
        className={clsx(
          'group flex items-center justify-between py-1.5 px-2 rounded-lg text-xs cursor-pointer transition-colors',
          isSelected
            ? 'bg-artemis-accent/15 text-artemis-accent font-semibold border border-artemis-accent/30'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
        )}
        style={{ paddingLeft: `${Math.max(8, level * 14 + 6)}px` }}
        onClick={() => onSelect(folder.id)}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              className="p-0.5 rounded hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-4.5" />
          )}

          {isSelected ? (
            <FolderOpen className="w-4 h-4 text-bronze-400 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-bronze-400/80 shrink-0" />
          )}

          <span className="truncate">{folder.name}</span>
        </div>

        <span
          className={clsx(
            'text-[10px] px-1.5 py-0.2 rounded font-mono ml-1 shrink-0',
            isSelected ? 'bg-artemis-accent/20 text-artemis-accent' : 'text-zinc-500'
          )}
        >
          {itemCount}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div className="space-y-0.5 mt-0.5">
          {childFolders.map((child) => (
            <TreeNode
              key={child.id}
              folder={child}
              allItems={allItems}
              currentFolderId={currentFolderId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FolderTreeView: React.FC = () => {
  const { items, currentFolderId, navigateToFolder } = useLibrary();

  const rootFolders = items.filter(
    (it) => it.parentId === null && it.type === 'folder' && !it.isDeleted
  );

  const totalActiveItems = items.filter((it) => !it.isDeleted).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Root All Files Button */}
      <button
        type="button"
        onClick={() => navigateToFolder(null)}
        className={clsx(
          'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors mb-2 text-left',
          currentFolderId === null
            ? 'bg-artemis-accent/15 text-artemis-accent font-semibold border border-artemis-accent/30'
            : 'text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60'
        )}
      >
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-artemis-accent shrink-0" />
          <span>Library Root</span>
        </div>
        <span
          className={clsx(
            'text-[10px] px-1.5 py-0.5 rounded font-mono',
            currentFolderId === null
              ? 'bg-artemis-accent/20 text-artemis-accent'
              : 'bg-zinc-800 text-zinc-400'
          )}
        >
          {totalActiveItems}
        </span>
      </button>

      {/* Directory Hierarchy Header */}
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Folder Directory
      </div>

      {/* Recursive Folder Tree */}
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
        {rootFolders.map((folder) => (
          <TreeNode
            key={folder.id}
            folder={folder}
            allItems={items}
            currentFolderId={currentFolderId}
            onSelect={navigateToFolder}
            level={0}
          />
        ))}

        {rootFolders.length === 0 && (
          <div className="px-3 py-4 text-[11px] text-zinc-500 text-center">
            No folders created yet.
          </div>
        )}
      </div>
    </div>
  );
};
