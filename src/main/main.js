/**
 * Main Process - Electron Application Entry Point
 *
 * Handles:
 * - Application lifecycle
 * - Window management
 * - IPC communication with renderer
 * - Database initialization
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const PPKDatabase = require('./database');
const { mainLogger, ipcLogger } = require('./logger');
const { initializeApis, routes } = require('./api');
const { createErrorResponse } = require('./utils/errorHandler');
const SatkerApi = require('./api/satkerApi');
const PegawaiApi = require('./api/pegawaiApi');
const SupplierApi = require('./api/supplierApi');

// Application state
let mainWindow;
let database;
let satkerApi;
let pegawaiApi;
let supplierApi;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/**
 * Create the main application window
 */
function createWindow() {
  mainLogger.info('Creating main window');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: path.join(__dirname, '../../build/icon.png'),
    show: false
  });

  // Load app
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  // Show when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainLogger.info('Main window displayed');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window errors
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    mainLogger.error('Renderer process crashed', { details });
  });

  mainWindow.webContents.on('unresponsive', () => {
    mainLogger.warn('Window became unresponsive');
  });
}

/**
 * Initialize the database
 */
function initializeDatabase() {
  try {
    mainLogger.info('Initializing database');
    database = new PPKDatabase();

    // Initialize all API modules with database
    initializeApis(database);

    // Initialize class-based APIs (they register their own IPC handlers)
    satkerApi = new SatkerApi(database.db);
    pegawaiApi = new PegawaiApi(database.db);
    supplierApi = new SupplierApi(database.db);

    mainLogger.info('Database initialized successfully');
    return true;
  } catch (error) {
    mainLogger.error('Database initialization failed', { error });
    return false;
  }
}

/**
 * Setup IPC handlers using route definitions
 */
function setupIPC() {
  mainLogger.info('Setting up IPC handlers');

  // Register all API routes
  for (const [channel, handler] of Object.entries(routes)) {
    ipcMain.handle(channel, async (event, ...args) => {
      const startTime = Date.now();

      ipcLogger.debug(`IPC call: ${channel}`, { args: args.length > 0 ? args[0] : null });

      try {
        // Call the route handler
        const result = await handler(...args);

        const duration = Date.now() - startTime;
        ipcLogger.debug(`IPC response: ${channel}`, {
          success: result?.success,
          duration: `${duration}ms`
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        ipcLogger.error(`IPC error: ${channel}`, {
          error: error.message,
          duration: `${duration}ms`
        });

        return createErrorResponse(error, { channel });
      }
    });
  }

  // Legacy handlers for backward compatibility
  setupLegacyHandlers();

  // System handlers
  setupSystemHandlers();

  mainLogger.info(`Registered ${Object.keys(routes).length} IPC routes`);
}

/**
 * Legacy IPC handlers (for backward compatibility with existing frontend)
 */
function setupLegacyHandlers() {
  // Legacy db:* handlers map to new routes
  ipcMain.handle('db:createRequest', async (event, data) => {
    return routes['request:create'](data);
  });

  ipcMain.handle('db:getRequests', async (event, filters) => {
    return routes['request:getAll'](filters);
  });

  ipcMain.handle('db:getRequestById', async (event, id) => {
    return routes['request:getById'](id);
  });

  ipcMain.handle('db:updateRequest', async (event, { id, updates }) => {
    return routes['request:update']({ id, data: updates });
  });

  ipcMain.handle('db:deleteRequest', async (event, id) => {
    return routes['request:delete'](id);
  });

  // Vendor handlers
  ipcMain.handle('db:createVendor', async (event, data) => {
    return routes['vendor:create'](data);
  });

  ipcMain.handle('db:getVendors', async (event, filters) => {
    return routes['vendor:getAll'](filters);
  });

  ipcMain.handle('db:getVendorById', async (event, id) => {
    return routes['vendor:getById'](id);
  });

  ipcMain.handle('db:updateVendor', async (event, { id, data }) => {
    return routes['vendor:update']({ id, data });
  });

  // Contract handlers
  ipcMain.handle('db:createContract', async (event, data) => {
    return routes['contract:create'](data);
  });

  ipcMain.handle('db:getContracts', async (event, filters) => {
    return routes['contract:getAll'](filters);
  });

  ipcMain.handle('db:getContractById', async (event, id) => {
    return routes['contract:getById'](id);
  });

  // Payment handlers
  ipcMain.handle('db:createPayment', async (event, data) => {
    return routes['payment:create'](data);
  });

  ipcMain.handle('db:getPayments', async (event, filters) => {
    return routes['payment:getAll'](filters);
  });

  // Stats
  ipcMain.handle('db:getStats', async () => {
    return routes['request:getStats']();
  });

  ipcMain.handle('db:getDashboardStats', async () => {
    return routes['report:getDashboard']();
  });

  // Backup
  ipcMain.handle('db:backup', async () => {
    try {
      const result = database.backup('manual');
      return { success: true, data: result };
    } catch (error) {
      return createErrorResponse(error, { operation: 'backup' });
    }
  });

  ipcMain.handle('db:getBackupHistory', async (event, limit) => {
    try {
      const history = database.getBackupHistory(limit);
      return { success: true, data: history };
    } catch (error) {
      return createErrorResponse(error, { operation: 'getBackupHistory' });
    }
  });
}

/**
 * System IPC handlers
 */
function setupSystemHandlers() {
  // App info
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:getPath', (event, name) => {
    try {
      return app.getPath(name);
    } catch (error) {
      return null;
    }
  });

  ipcMain.handle('app:getPlatform', () => {
    return process.platform;
  });

  ipcMain.handle('app:isDev', () => {
    return process.env.NODE_ENV === 'development' || !app.isPackaged;
  });

  // Logging
  ipcMain.handle('log:write', (event, { level, message, meta }) => {
    const { rendererLogger } = require('./logger');
    rendererLogger[level](message, meta);
  });

  ipcMain.handle('log:getFiles', () => {
    return mainLogger.getLogFiles();
  });

  ipcMain.handle('log:getContents', (event, { type, lines }) => {
    return mainLogger.getLogContents(type, lines);
  });

  // Dialogs
  ipcMain.handle('dialog:showOpenDialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
  });

  ipcMain.handle('dialog:showSaveDialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
  });

  ipcMain.handle('dialog:showMessageBox', async (event, options) => {
    const result = await dialog.showMessageBox(mainWindow, options);
    return result;
  });

  // Database utilities
  ipcMain.handle('db:restore', async (event, backupPath) => {
    try {
      const result = database.restore(backupPath);
      initializeApis(database);
      return { success: true, data: result };
    } catch (error) {
      return createErrorResponse(error, { operation: 'restore' });
    }
  });

  ipcMain.handle('db:getCurrentVersion', () => {
    try {
      return {
        success: true,
        data: { version: database.getCurrentSchemaVersion() }
      };
    } catch (error) {
      return createErrorResponse(error);
    }
  });

  // Window controls
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() || false;
  });
}

// ==================== Application Lifecycle ====================

app.whenReady().then(async () => {
  mainLogger.info('Application starting', {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch
  });

  // Initialize database
  const dbInitialized = initializeDatabase();
  if (!dbInitialized) {
    mainLogger.error('Failed to initialize database, showing error dialog');
    dialog.showErrorBox(
      'Database Error',
      'Failed to initialize the database. The application will now close.'
    );
    app.quit();
    return;
  }

  // Setup IPC handlers
  setupIPC();

  // Create window
  createWindow();

  // macOS specific: recreate window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  mainLogger.info('All windows closed');

  if (database) {
    database.close();
    mainLogger.info('Database connection closed');
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  mainLogger.info('Application quitting');

  if (database) {
    database.close();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  mainLogger.error('Uncaught exception', { error: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason, promise) => {
  mainLogger.error('Unhandled rejection', { reason: String(reason) });
});

module.exports = { mainWindow, database };
