import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
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
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  listWorkOrders,
  getWorkOrder,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
  listEstimates,
  getEstimate,
  createEstimate,
  updateEstimate,
  reopenEstimate,
  deleteEstimate,
} from './automotiveStorage';
import {
  listScheduleEvents,
  getScheduleEvent,
  createScheduleEvent,
  updateScheduleEvent,
  deleteScheduleEvent,
  checkOverlap,
} from './scheduleStorage';
import {
  getCurrentMission,
  setCurrentMission,
  clearCurrentMission,
} from './homeStorage';

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

  ipcMain.handle('artemis:documents:exportPDF', async (_event, defaultTitle) => {
    if (!mainWindow) {
      return { success: false, error: 'Main window not available' };
    }

    try {
      const sanitizedName = (defaultTitle || 'document')
        .replace(/[/\\?%*:|"<>]/g, '-')
        .trim();

      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Document to PDF',
        defaultPath: path.join(app.getPath('documents'), `${sanitizedName}.pdf`),
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }],
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      const pdfData = await mainWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'Letter',
        margins: {
          marginType: 'default',
        },
      });

      await fs.writeFile(filePath, pdfData);
      return { success: true, filePath };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Failed to export PDF:', err);
      return { success: false, error: msg };
    }
  });

  // ---------------------------------------------------------------------------
  // Authoritative Automotive IPC Endpoints
  // ---------------------------------------------------------------------------

  ipcMain.handle('artemis:automotive:listCustomers', async (_event, filter) => {
    return listCustomers(filter);
  });

  ipcMain.handle('artemis:automotive:getCustomer', async (_event, id) => {
    return getCustomer(id);
  });

  ipcMain.handle('artemis:automotive:createCustomer', async (_event, options) => {
    return createCustomer(options);
  });

  ipcMain.handle('artemis:automotive:updateCustomer', async (_event, id, updates) => {
    return updateCustomer(id, updates);
  });

  ipcMain.handle('artemis:automotive:deleteCustomer', async (_event, id) => {
    return deleteCustomer(id);
  });

  ipcMain.handle('artemis:automotive:listVehicles', async (_event, filter) => {
    return listVehicles(filter);
  });

  ipcMain.handle('artemis:automotive:getVehicle', async (_event, id) => {
    return getVehicle(id);
  });

  ipcMain.handle('artemis:automotive:createVehicle', async (_event, options) => {
    return createVehicle(options);
  });

  ipcMain.handle('artemis:automotive:updateVehicle', async (_event, id, updates) => {
    return updateVehicle(id, updates);
  });

  ipcMain.handle('artemis:automotive:deleteVehicle', async (_event, id) => {
    return deleteVehicle(id);
  });

  ipcMain.handle('artemis:automotive:listWorkOrders', async (_event, filter) => {
    return listWorkOrders(filter);
  });

  ipcMain.handle('artemis:automotive:getWorkOrder', async (_event, id) => {
    return getWorkOrder(id);
  });

  ipcMain.handle('artemis:automotive:createWorkOrder', async (_event, options) => {
    return createWorkOrder(options);
  });

  ipcMain.handle('artemis:automotive:updateWorkOrder', async (_event, id, updates) => {
    return updateWorkOrder(id, updates);
  });

  ipcMain.handle('artemis:automotive:deleteWorkOrder', async (_event, id) => {
    return deleteWorkOrder(id);
  });

  // Estimates (V0.0.8)
  ipcMain.handle('artemis:automotive:estimates:list', async (_event, filter) => {
    return listEstimates(filter);
  });

  ipcMain.handle('artemis:automotive:estimates:get', async (_event, id) => {
    return getEstimate(id);
  });

  ipcMain.handle('artemis:automotive:estimates:create', async (_event, options) => {
    return createEstimate(options);
  });

  ipcMain.handle('artemis:automotive:estimates:update', async (_event, id, updates) => {
    return updateEstimate(id, updates);
  });

  ipcMain.handle('artemis:automotive:estimates:reopen', async (_event, id) => {
    return reopenEstimate(id);
  });

  ipcMain.handle('artemis:automotive:estimates:delete', async (_event, id) => {
    return deleteEstimate(id);
  });

  // ---------------------------------------------------------------------------
  // Authoritative Schedule IPC Endpoints (V0.0.6)
  // ---------------------------------------------------------------------------

  ipcMain.handle('artemis:schedule:list', async (_event, filter) => {
    return listScheduleEvents(filter);
  });

  ipcMain.handle('artemis:schedule:get', async (_event, id) => {
    return getScheduleEvent(id);
  });

  ipcMain.handle('artemis:schedule:create', async (_event, options) => {
    return createScheduleEvent(options);
  });

  ipcMain.handle('artemis:schedule:update', async (_event, id, updates) => {
    return updateScheduleEvent(id, updates);
  });

  ipcMain.handle('artemis:schedule:delete', async (_event, id) => {
    return deleteScheduleEvent(id);
  });

  ipcMain.handle('artemis:schedule:checkOverlap', async (_event, startAt, endAt, excludeEventId) => {
    return checkOverlap(startAt, endAt, excludeEventId);
  });

  // ---------------------------------------------------------------------------
  // Authoritative Home & Current Mission IPC Endpoints (V0.0.7)
  // ---------------------------------------------------------------------------

  ipcMain.handle('artemis:home:getCurrentMission', async () => {
    return getCurrentMission();
  });

  ipcMain.handle('artemis:home:setCurrentMission', async (_event, options) => {
    return setCurrentMission(options);
  });

  ipcMain.handle('artemis:home:clearCurrentMission', async () => {
    return clearCurrentMission();
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
