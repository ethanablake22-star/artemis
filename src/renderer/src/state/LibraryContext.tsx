import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import type { LibraryItem } from '@shared/libraryTypes';
import { libraryRepository } from '../services/libraryStorage';

export interface BreadcrumbEntry {
  id: string | null;
  name: string;
}

interface LibraryContextValue {
  items: LibraryItem[];
  isLoading: boolean;
  error: string | null;
  currentFolderId: string | null;
  currentFolder: LibraryItem | null;
  folderContents: LibraryItem[];
  filteredContents: LibraryItem[];
  breadcrumbs: BreadcrumbEntry[];
  selectedItemId: string | null;
  selectedItem: LibraryItem | null;
  viewMode: 'grid' | 'list';
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSelectedItemId: (id: string | null) => void;
  navigateToFolder: (folderId: string | null) => void;
  navigateUp: () => void;
  createFolder: (name: string, parentId?: string | null) => Promise<LibraryItem>;
  createDocument: (name: string, parentId?: string | null) => Promise<LibraryItem>;
  renameItem: (id: string, newName: string) => Promise<LibraryItem>;
  moveItem: (id: string, newParentId: string | null) => Promise<LibraryItem>;
  deleteItem: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all items (including deleted so we have tree context, filtered in views)
      const loadedItems = await libraryRepository.listItems({ includeDeleted: true });
      setItems(loadedItems);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Failed to load library items:', e);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute active folder object
  const currentFolder = useMemo(() => {
    if (!currentFolderId) return null;
    return items.find((item) => item.id === currentFolderId && !item.isDeleted) || null;
  }, [items, currentFolderId]);

  // If currentFolder was deleted, fallback to root
  useEffect(() => {
    if (currentFolderId && !currentFolder && !isLoading) {
      setCurrentFolderId(null);
    }
  }, [currentFolderId, currentFolder, isLoading]);

  // Compute contents of the current folder
  const folderContents = useMemo(() => {
    return items
      .filter((item) => item.parentId === currentFolderId && !item.isDeleted)
      .sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
  }, [items, currentFolderId]);

  // Compute search filtered contents
  const filteredContents = useMemo(() => {
    if (!searchQuery.trim()) {
      return folderContents;
    }
    const q = searchQuery.toLowerCase().trim();
    return items
      .filter((item) => !item.isDeleted && item.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
      });
  }, [folderContents, items, searchQuery]);

  // Compute breadcrumbs hierarchy from root to current folder
  const breadcrumbs = useMemo(() => {
    const crumbs: BreadcrumbEntry[] = [{ id: null, name: 'Library' }];
    if (!currentFolderId) {
      return crumbs;
    }

    const pathCrumbItems: BreadcrumbEntry[] = [];
    let currId: string | null = currentFolderId;

    while (currId) {
      const folder = items.find((it) => it.id === currId && !it.isDeleted);
      if (!folder) break;
      pathCrumbItems.unshift({ id: folder.id, name: folder.name });
      currId = folder.parentId;
    }

    return [...crumbs, ...pathCrumbItems];
  }, [items, currentFolderId]);

  // Selected item object
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find((item) => item.id === selectedItemId && !item.isDeleted) || null;
  }, [items, selectedItemId]);

  const navigateToFolder = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedItemId(null);
    setSearchQuery('');
  }, []);

  const navigateUp = useCallback(() => {
    if (!currentFolderId) return;
    const current = items.find((it) => it.id === currentFolderId);
    setCurrentFolderId(current ? current.parentId : null);
    setSelectedItemId(null);
  }, [currentFolderId, items]);

  const createFolder = useCallback(
    async (name: string, parentId?: string | null): Promise<LibraryItem> => {
      const targetParentId = parentId !== undefined ? parentId : currentFolderId;
      const newFolder = await libraryRepository.createItem({
        name: name.trim() || 'Untitled Folder',
        type: 'folder',
        parentId: targetParentId,
      });

      setItems((prev) => [...prev, newFolder]);
      setSelectedItemId(newFolder.id);
      return newFolder;
    },
    [currentFolderId]
  );

  const createDocument = useCallback(
    async (name: string, parentId?: string | null): Promise<LibraryItem> => {
      const targetParentId = parentId !== undefined ? parentId : currentFolderId;
      const trimmedName = name.trim() || 'Untitled Document.doc';
      const finalName = trimmedName.includes('.') ? trimmedName : `${trimmedName}.doc`;

      const newDoc = await libraryRepository.createItem({
        name: finalName,
        type: 'document',
        parentId: targetParentId,
        metadata: {
          size: 0,
          description: 'Placeholder Artemis document',
        },
      });

      setItems((prev) => [...prev, newDoc]);
      setSelectedItemId(newDoc.id);
      return newDoc;
    },
    [currentFolderId]
  );

  const renameItem = useCallback(
    async (id: string, newName: string): Promise<LibraryItem> => {
      const trimmedName = newName.trim();
      if (!trimmedName) {
        throw new Error('Item name cannot be empty');
      }

      const updated = await libraryRepository.updateItem(id, { name: trimmedName });
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      return updated;
    },
    []
  );

  const moveItem = useCallback(
    async (id: string, newParentId: string | null): Promise<LibraryItem> => {
      const updated = await libraryRepository.moveItem(id, newParentId);
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      return updated;
    },
    []
  );

  const deleteItem = useCallback(
    async (id: string): Promise<void> => {
      await libraryRepository.deleteItem(id);
      // Reload items to reflect authoritative cascading soft-deletes performed by main process
      const updatedItems = await libraryRepository.listItems({ includeDeleted: true });
      setItems(updatedItems);
      if (selectedItemId === id) {
        setSelectedItemId(null);
      }
      if (currentFolderId === id) {
        navigateUp();
      }
    },
    [selectedItemId, currentFolderId, navigateUp]
  );

  const value = useMemo(
    () => ({
      items,
      isLoading,
      error,
      currentFolderId,
      currentFolder,
      folderContents,
      filteredContents,
      breadcrumbs,
      selectedItemId,
      selectedItem,
      viewMode,
      searchQuery,
      setSearchQuery,
      setViewMode,
      setSelectedItemId,
      navigateToFolder,
      navigateUp,
      createFolder,
      createDocument,
      renameItem,
      moveItem,
      deleteItem,
      refresh: loadData,
    }),
    [
      items,
      isLoading,
      error,
      currentFolderId,
      currentFolder,
      folderContents,
      filteredContents,
      breadcrumbs,
      selectedItemId,
      selectedItem,
      viewMode,
      searchQuery,
      navigateToFolder,
      navigateUp,
      createFolder,
      createDocument,
      renameItem,
      moveItem,
      deleteItem,
      loadData,
    ]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
};

export const useLibrary = (): LibraryContextValue => {
  const context = useContext(LibraryContext);
  if (!context) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
};
