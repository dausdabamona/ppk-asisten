const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const PPKDatabase = require('./database');

let mainWindow;
let database;

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

function createWindow() {
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
    show: false // Don't show until ready
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
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  console.log('App is ready, initializing...');
  
  // Initialize database
  try {
    database = new PPKDatabase();
    console.log('Database initialized');
  } catch (error) {
    console.error('Database initialization failed:', error);
  }

  // Setup IPC handlers
  setupIPC();

  // Create window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (database) {
    database.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (database) {
    database.close();
  }
});

// IPC Handlers
function setupIPC() {
  // Database operations
  ipcMain.handle('db:createRequest', async (event, data) => {
    try {
      const result = await database.createRequest(data);
      return { success: true, data: result };
    } catch (error) {
      console.error('Create request failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getRequests', async (event, filters) => {
    try {
      const requests = await database.getRequests(filters);
      return { success: true, data: requests };
    } catch (error) {
      console.error('Get requests failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getRequestById', async (event, id) => {
    try {
      const request = await database.getRequestById(id);
      return { success: true, data: request };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:updateRequest', async (event, { id, updates }) => {
    try {
      const result = await database.updateRequest(id, updates);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Get app info
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:getPath', (event, name) => {
    return app.getPath(name);
  });
}
