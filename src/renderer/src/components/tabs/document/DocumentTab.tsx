import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Edit2,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { documentsRepository } from '../../../services/documentStorage';
import { useLibrary } from '../../../state/LibraryContext';
import { useTabs } from '../../../state/TabContext';
import { DocumentToolbar } from './DocumentToolbar';
import { DocumentCanvas } from './DocumentCanvas';
import type { ArtemisDocumentRecord } from '@shared/documentTypes';

interface DocumentTabProps {
  libraryItemId: string;
}

type SaveStatus = 'saved' | 'saving' | 'error' | 'idle';

export const DocumentTab: React.FC<DocumentTabProps> = ({ libraryItemId }) => {
  const { items, renameItem } = useLibrary();
  const { tabs, activeTabId, syncDocumentTitle, registerBeforeClose } = useTabs();

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

  // Initialize TipTap Editor
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

      // If there are unsaved pending edits
      if (editGenerationRef.current > savedGenerationRef.current && pendingContentRef.current) {
        const success = await performSave(pendingContentRef.current, editGenerationRef.current);
        return success; // Return true to allow close, false to block close and show error
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

  return (
    <div className="flex flex-col h-full w-full bg-artemis-950 overflow-hidden">
      {/* Top Document Header Bar */}
      <div className="h-12 bg-artemis-950 border-b border-slate-800 px-5 flex items-center justify-between gap-4 shrink-0 select-none">
        {/* Document Title & Icon */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
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
                className="bg-artemis-900 border border-artemis-accent/50 rounded px-2 py-0.5 text-xs text-slate-100 font-semibold focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTitle(false)}
                className="p-1 rounded text-slate-400 hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={handleStartTitleEdit}
              className="group flex items-center gap-2 cursor-pointer py-1 px-1.5 -ml-1.5 rounded hover:bg-slate-800/60 transition-colors max-w-md"
            >
              <span className="text-xs font-bold text-slate-100 truncate tracking-wide">
                {documentTitle}
              </span>
              <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          )}
        </div>

        {/* Status Indicators: Revision, Autosave state */}
        <div className="flex items-center gap-4 text-xs shrink-0">
          {documentRecord && (
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-600" />
              Rev {documentRecord.revision}
            </span>
          )}

          {/* Save Status Badge */}
          <div className="flex items-center gap-1.5 font-medium">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-amber-400 text-[11px]">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                Saving…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
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
        </div>
      </div>

      {/* Editor Formatting Toolbar */}
      <DocumentToolbar editor={editor} />

      {/* Loading Overlay / Error Banner / Main Paper Document Canvas */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-artemis-950 text-slate-500 text-xs">
          Loading document content…
        </div>
      ) : errorMessage && !documentRecord ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-artemis-950 text-slate-400 text-xs p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
          <h4 className="text-sm font-bold text-slate-200">Failed to Load Document</h4>
          <p className="text-slate-400 mt-1 max-w-sm">{errorMessage}</p>
        </div>
      ) : (
        <DocumentCanvas editor={editor} />
      )}
    </div>
  );
};
