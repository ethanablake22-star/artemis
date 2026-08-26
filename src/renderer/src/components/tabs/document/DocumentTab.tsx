import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Check,
  X,
  Layers,
  Printer,
  FileDown,
  Target,
} from 'lucide-react';
import { documentsRepository } from '../../../services/documentStorage';
import { useLibrary } from '../../../state/LibraryContext';
import { useTabs } from '../../../state/TabContext';
import { useHome } from '../../../state/HomeContext';
import { DocumentToolbar } from './DocumentToolbar';
import { DocumentCanvas } from './DocumentCanvas';
import type { ArtemisDocumentRecord } from '@shared/documentTypes';
import clsx from 'clsx';

interface DocumentTabProps {
  libraryItemId: string;
}

type SaveStatus = 'saved' | 'saving' | 'error' | 'idle';

export const DocumentTab: React.FC<DocumentTabProps> = ({ libraryItemId }) => {
  const { items, renameItem } = useLibrary();
  const { tabs, activeTabId, syncDocumentTitle, registerBeforeClose } = useTabs();
  const { setCurrentMission, clearCurrentMission, isCurrentMission } = useHome();

  const [documentRecord, setDocumentRecord] = useState<ArtemisDocumentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  const libraryItem = items.find((it) => it.id === libraryItemId);
  const documentTitle = libraryItem ? libraryItem.name : 'Document';

  // Race-safe edit generation tracking
  const editGenerationRef = useRef<number>(0);
  const savedGenerationRef = useRef<number>(0);
  const pendingContentRef = useRef<Record<string, unknown> | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Perform save to authoritative main process
  const performSave = useCallback(
    async (content: Record<string, unknown>, generationToSave: number): Promise<boolean> => {
      setSaveStatus('saving');
      setErrorMessage(null);
      try {
        const updated = await documentsRepository.updateDocumentContent(libraryItemId, content);
        setDocumentRecord(updated);

        // Record the generation that was successfully persisted
        savedGenerationRef.current = Math.max(savedGenerationRef.current, generationToSave);

        // Race-safety check: Only display "Saved" if no newer edits occurred while save was in-flight
        if (editGenerationRef.current === savedGenerationRef.current) {
          setSaveStatus('saved');
          pendingContentRef.current = null;
        }
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Failed to autosave document:', err);
        setSaveStatus('error');
        setErrorMessage(msg);
        return false;
      }
    },
    [libraryItemId]
  );

  // Debounced save trigger
  const triggerAutosave = useCallback(
    (content: Record<string, unknown>) => {
      const currentGen = ++editGenerationRef.current;
      pendingContentRef.current = content;
      setSaveStatus('saving');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        performSave(content, currentGen);
      }, 700);
    },
    [performSave]
  );

  // Initialize TipTap Editor with Business Extensions
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: undefined,
    onUpdate: ({ editor: currentEditor }) => {
      const json = currentEditor.getJSON();
      triggerAutosave(json);
    },
  });

  // Load document content from main store
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    documentsRepository
      .getDocument(libraryItemId)
      .then((doc) => {
        if (!isMounted) return;
        setDocumentRecord(doc);
        if (doc?.content && editor) {
          editor.commands.setContent(doc.content);
        }
        editGenerationRef.current = 0;
        savedGenerationRef.current = 0;
        setSaveStatus('saved');
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error loading document:', err);
        setErrorMessage(err instanceof Error ? err.message : String(err));
        setSaveStatus('error');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [libraryItemId, editor]);

  // Register beforeClose flush handler with TabContext to prevent losing edits on tab close
  useEffect(() => {
    const currentTab = tabs.find((t) => t.resourceId === libraryItemId);
    const tabId = currentTab ? currentTab.id : activeTabId;

    const unregister = registerBeforeClose(tabId, async () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      if (editGenerationRef.current > savedGenerationRef.current && pendingContentRef.current) {
        const success = await performSave(pendingContentRef.current, editGenerationRef.current);
        return success;
      }

      return true;
    });

    return unregister;
  }, [tabs, libraryItemId, activeTabId, registerBeforeClose, performSave]);

  // Handle title rename submit
  const handleSaveTitle = async () => {
    if (titleInput.trim() && titleInput.trim() !== documentTitle) {
      try {
        const newTitle = titleInput.trim();
        await renameItem(libraryItemId, newTitle);
        syncDocumentTitle(libraryItemId, newTitle);
        setIsEditingTitle(false);
      } catch (err) {
        console.error('Failed to rename document:', err);
      }
    } else {
      setIsEditingTitle(false);
    }
  };

  const handleStartTitleEdit = () => {
    setTitleInput(documentTitle);
    setIsEditingTitle(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    try {
      await documentsRepository.exportPDF(documentTitle);
    } catch (e) {
      console.error('Export PDF failed:', e);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-artemis-950 overflow-hidden">
      {/* Top Document Header Bar (Hidden in print) */}
      <div className="h-12 bg-artemis-950 border-b border-zinc-800 px-5 flex items-center justify-between gap-4 shrink-0 select-none print:hidden">
        {/* Document Title & Icon */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-silver-500/10 border border-silver-500/20 text-silver-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>

          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                autoFocus
                className="bg-artemis-900 border border-artemis-accent/50 rounded px-2 py-0.5 text-xs text-zinc-100 font-semibold focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 rounded text-bronze-400 hover:bg-bronze-500/10"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTitle(false)}
                className="p-1 rounded text-zinc-400 hover:bg-zinc-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={handleStartTitleEdit}
              className="group flex items-center gap-2 cursor-pointer py-1 px-1.5 -ml-1.5 rounded hover:bg-zinc-800/60 transition-colors max-w-md"
            >
              <span className="text-xs font-bold text-zinc-100 truncate tracking-wide">
                {documentTitle}
              </span>
              <Edit2 className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          )}
        </div>

        {/* Status Indicators: Revision, Autosave state, Quick Actions */}
        <div className="flex items-center gap-4 text-xs shrink-0">
          {documentRecord && (
            <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1">
              <Layers className="w-3 h-3 text-zinc-600" />
              Rev {documentRecord.revision}
            </span>
          )}

          {/* Save Status Badge */}
          <div className="flex items-center gap-1.5 font-medium">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-bronze-400 text-[11px]">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-bronze-400 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span
                className="flex items-center gap-1.5 text-red-400 text-[11px]"
                title={errorMessage || 'Autosave failed'}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMessage ? `Save error: ${errorMessage}` : 'Save error'}
              </span>
            )}
          </div>

          <div className="w-px h-4 bg-zinc-800" />

          {/* Current Mission Button */}
          {libraryItem && !libraryItem.isDeleted && (
            <button
              type="button"
              onClick={async () => {
                if (isCurrentMission('document', libraryItemId)) {
                  await clearCurrentMission();
                } else {
                  await setCurrentMission({ resourceType: 'document', resourceId: libraryItemId });
                }
              }}
              className={clsx(
                'px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all',
                isCurrentMission('document', libraryItemId)
                  ? 'bg-bronze-500/20 text-bronze-300 border border-bronze-500/40 shadow-sm shadow-bronze-500/10'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
              )}
            >
              <Target className={clsx('w-3 h-3', isCurrentMission('document', libraryItemId) && 'text-bronze-400 fill-bronze-400/20')} />
              {isCurrentMission('document', libraryItemId) ? '★ Current Mission' : 'Set as Current Mission'}
            </button>
          )}

          {/* Header Quick Buttons for Print & PDF */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              title="Print Document (Ctrl+P)"
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              title="Export as PDF"
              className="px-2 py-1 rounded bg-artemis-accent/10 hover:bg-artemis-accent/20 text-artemis-accent border border-artemis-accent/30 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
            >
              <FileDown className="w-3 h-3" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Editor Formatting Toolbar (Hidden in print) */}
      <div className="print:hidden">
        <DocumentToolbar
          editor={editor}
          onPrint={handlePrint}
          onExportPDF={handleExportPDF}
        />
      </div>

      {/* Loading Overlay / Error Banner / Main Paper Document Canvas */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-artemis-950 text-zinc-500 text-xs">
          Loading document content…
        </div>
      ) : errorMessage && !documentRecord ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-artemis-950 text-zinc-400 text-xs p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
          <h4 className="text-sm font-bold text-zinc-200">Failed to Load Document</h4>
          <p className="text-zinc-400 mt-1 max-w-sm">{errorMessage}</p>
        </div>
      ) : (
        <DocumentCanvas editor={editor} />
      )}
    </div>
  );
};
