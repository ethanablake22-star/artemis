import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  listItems,
  getItem,
  createItem,
  updateItem,
  moveItem,
  deleteItem,
} from './libraryStorage';
import {
  getDocument,
  updateDocumentContent,
} from './documentStorage';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, '../..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron/main');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'Artemis',
    backgroundColor: '#07090e',
    titleBarStyle: 'hidden',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: true,
    },
  });

  // Window controls IPC
  ipcMain.on('artemis:window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('artemis:window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('artemis:window:close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('artemis:window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });

  ipcMain.handle('artemis:app:version', () => {
    return app.getVersion();
  });

  // ---------------------------------------------------------------------------
  // Authoritative Library IPC Endpoints
  // ---------------------------------------------------------------------------

  ipcMain.handle('artemis:library:list', async (_event, filter) => {
    return listItems(filter);
  });

  ipcMain.handle('artemis:library:get', async (_event, id) => {
    return getItem(id);
  });

  ipcMain.handle('artemis:library:create', async (_event, options) => {
    return createItem(options);
  });

  ipcMain.handle('artemis:library:update', async (_event, id, updates) => {
    return updateItem(id, updates);
  });

  ipcMain.handle('artemis:library:move', async (_event, id, newParentId) => {
    return moveItem(id, newParentId);
  });

  ipcMain.handle('artemis:library:delete', async (_event, id) => {
    return deleteItem(id);
  });

  // ---------------------------------------------------------------------------
  // Authoritative Document IPC Endpoints
  // ---------------------------------------------------------------------------

  ipcMain.handle('artemis:documents:get', async (_event, libraryItemId) => {
    return getDocument(libraryItemId);
  });

  ipcMain.handle('artemis:documents:updateContent', async (_event, libraryItemId, content) => {
    return updateDocumentContent(libraryItemId, content);
  });

  // Open external URLs in the user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    mainWindow = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
