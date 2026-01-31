const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  db: {
    createRequest: (data) => ipcRenderer.invoke('db:createRequest', data),
    getRequests: (filters) => ipcRenderer.invoke('db:getRequests', filters),
    getRequestById: (id) => ipcRenderer.invoke('db:getRequestById', id),
    updateRequest: (id, updates) => ipcRenderer.invoke('db:updateRequest', { id, updates }),
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPath: (name) => ipcRenderer.invoke('app:getPath', name),
  }
});

// Log that preload is loaded
console.log('Preload script loaded successfully');
