import React from 'react';
import { ChevronRight, ArrowLeft, Folder } from 'lucide-react';
import { useLibrary, type BreadcrumbEntry } from '../../../state/LibraryContext';
import clsx from 'clsx';

export const BreadcrumbNav: React.FC = () => {
  const { breadcrumbs, currentFolderId, navigateToFolder, navigateUp } = useLibrary();

  return (
    <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar py-1">
      {/* Up Button */}
      {currentFolderId && (
        <button
          type="button"
          onClick={navigateUp}
          title="Go to parent folder"
          className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors mr-1 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      )}

      {/* Breadcrumb Path Items */}
      {breadcrumbs.map((crumb: BreadcrumbEntry, index: number) => {
        const isLast = index === breadcrumbs.length - 1;
        const isRoot = index === 0;

        return (
          <React.Fragment key={crumb.id || 'root'}>
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            )}

            <button
              type="button"
              onClick={() => navigateToFolder(crumb.id)}
              className={clsx(
                'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors shrink-0 max-w-[180px]',
                isLast
                  ? 'bg-artemis-accent/15 text-artemis-accent font-semibold border border-artemis-accent/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              )}
            >
              {isRoot && <Folder className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{crumb.name}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};
