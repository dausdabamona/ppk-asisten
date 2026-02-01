/**
 * Preload Script - Secure Bridge between Main and Renderer
 *
 * Exposes safe APIs to the renderer process via contextBridge
 * All IPC communication goes through here
 */

// Immediate debug log
console.log('🚀 PRELOAD SCRIPT STARTING...');

try {
  const { contextBridge, ipcRenderer } = require('electron');

  console.log('✅ Electron modules loaded');
  console.log('contextBridge:', typeof contextBridge);
  console.log('ipcRenderer:', typeof ipcRenderer);

  if (!contextBridge) {
    throw new Error('contextBridge is not available!');
  }
  
  if (!ipcRenderer) {
    throw new Error('ipcRenderer is not available!');
  }

  // Helper to create IPC invoke wrapper
  const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

  console.log('🔧 Starting to expose electronAPI...');

  // Expose protected methods to renderer process
  contextBridge.exposeInMainWorld('electronAPI', {
  // ==================== Request API ====================
  request: {
    create: (data) => ipcRenderer.invoke('request:create', data),
    getAll: (filters) => ipcRenderer.invoke('request:getAll', filters),
    getById: (id) => ipcRenderer.invoke('request:getById', id),
    getWithDetails: (id) => ipcRenderer.invoke('request:getWithDetails', id),
    update: (id, data) => ipcRenderer.invoke('request:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('request:delete', id),
    submit: (id) => ipcRenderer.invoke('request:submit', id),
    approve: (id, approverId, comments) => ipcRenderer.invoke('request:approve', { id, approverId, comments }),
    reject: (id, approverId, reason) => ipcRenderer.invoke('request:reject', { id, approverId, reason }),
    cancel: (id, reason) => ipcRenderer.invoke('request:cancel', { id, reason }),
    complete: (id) => ipcRenderer.invoke('request:complete', id),
    getStats: (filters) => ipcRenderer.invoke('request:getStats', filters)
  },

  // ==================== Vendor API ====================
  vendor: {
    create: (data) => ipcRenderer.invoke('vendor:create', data),
    getAll: (filters) => ipcRenderer.invoke('vendor:getAll', filters),
    getActive: (filters) => ipcRenderer.invoke('vendor:getActive', filters),
    getById: (id) => ipcRenderer.invoke('vendor:getById', id),
    getWithContracts: (id) => ipcRenderer.invoke('vendor:getWithContracts', id),
    update: (id, data) => ipcRenderer.invoke('vendor:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('vendor:delete', id),
    deactivate: (id) => ipcRenderer.invoke('vendor:deactivate', id),
    activate: (id) => ipcRenderer.invoke('vendor:activate', id),
    updateRating: (id, rating, notes) => ipcRenderer.invoke('vendor:updateRating', { id, rating, notes }),
    search: (query) => ipcRenderer.invoke('vendor:search', query),
    getTopPerformers: (minRating) => ipcRenderer.invoke('vendor:getTopPerformers', minRating)
  },

  // ==================== Contract API ====================
  contract: {
    create: (data) => ipcRenderer.invoke('contract:create', data),
    getAll: (filters) => ipcRenderer.invoke('contract:getAll', filters),
    getById: (id) => ipcRenderer.invoke('contract:getById', id),
    getWithPayments: (id) => ipcRenderer.invoke('contract:getWithPayments', id),
    update: (id, data) => ipcRenderer.invoke('contract:update', { id, data }),
    activate: (id, signedBy, signedDate) => ipcRenderer.invoke('contract:activate', { id, signedBy, signedDate }),
    complete: (id) => ipcRenderer.invoke('contract:complete', id),
    terminate: (id, reason) => ipcRenderer.invoke('contract:terminate', { id, reason }),
    getExpiring: (daysAhead) => ipcRenderer.invoke('contract:getExpiring', daysAhead),
    processExpired: () => ipcRenderer.invoke('contract:processExpired'),
    getByVendor: (vendorId) => ipcRenderer.invoke('contract:getByVendor', vendorId),
    getByRequest: (requestId) => ipcRenderer.invoke('contract:getByRequest', requestId)
  },

  // ==================== Payment API ====================
  payment: {
    create: (data) => ipcRenderer.invoke('payment:create', data),
    getAll: (filters) => ipcRenderer.invoke('payment:getAll', filters),
    getById: (id) => ipcRenderer.invoke('payment:getById', id),
    getByContract: (contractId) => ipcRenderer.invoke('payment:getByContract', contractId),
    update: (id, data) => ipcRenderer.invoke('payment:update', { id, data }),
    process: (id, processedBy) => ipcRenderer.invoke('payment:process', { id, processedBy }),
    complete: (id, referenceNumber, paymentDate) => ipcRenderer.invoke('payment:complete', { id, referenceNumber, paymentDate }),
    fail: (id, reason) => ipcRenderer.invoke('payment:fail', { id, reason }),
    cancel: (id, reason) => ipcRenderer.invoke('payment:cancel', { id, reason }),
    retry: (id) => ipcRenderer.invoke('payment:retry', id),
    getOverdue: () => ipcRenderer.invoke('payment:getOverdue'),
    getUpcoming: (daysAhead) => ipcRenderer.invoke('payment:getUpcoming', daysAhead),
    getContractStats: (contractId) => ipcRenderer.invoke('payment:getContractStats', contractId)
  },

  // ==================== Document API ====================
  document: {
    // Attachment management
    create: (data) => ipcRenderer.invoke('document:create', data),
    getAll: (filters) => ipcRenderer.invoke('document:getAll', filters),
    getByRequest: (requestId) => ipcRenderer.invoke('document:getByRequest', requestId),
    getByContract: (contractId) => ipcRenderer.invoke('document:getByContract', contractId),
    getByPayment: (paymentId) => ipcRenderer.invoke('document:getByPayment', paymentId),
    delete: (id) => ipcRenderer.invoke('document:delete', id),
    saveFile: (fileData, fileName, options) => ipcRenderer.invoke('document:saveFile', { fileData, fileName, options }),

    // Basic PDF generation
    generateRequestPdf: (requestId) => ipcRenderer.invoke('document:generateRequestPdf', requestId),
    generateContractPdf: (contractId) => ipcRenderer.invoke('document:generateContractPdf', contractId),
    generatePaymentVoucherPdf: (paymentId) => ipcRenderer.invoke('document:generatePaymentVoucherPdf', paymentId),

    // Professional document generation
    generateKwitansi: (requestId, options) => ipcRenderer.invoke('document:generateKwitansi', { requestId, options }),
    generateSPP: (requestId, options) => ipcRenderer.invoke('document:generateSPP', { requestId, options }),
    generateSPM: (requestId, options) => ipcRenderer.invoke('document:generateSPM', { requestId, options }),
    generateContractDoc: (contractId, options) => ipcRenderer.invoke('document:generateContractDoc', { contractId, options }),
    generateBAST: (contractId, options) => ipcRenderer.invoke('document:generateBAST', { contractId, options }),

    // Batch generation
    generateBatch: (items) => ipcRenderer.invoke('document:generateBatch', items),

    // Generated document management
    getGeneratedDocuments: (requestId) => ipcRenderer.invoke('document:getGeneratedDocuments', requestId),
    deleteGeneratedDocument: (documentId) => ipcRenderer.invoke('document:deleteGeneratedDocument', documentId),

    // Storage
    getStorageStats: () => ipcRenderer.invoke('document:getStorageStats')
  },

  // ==================== Report API ====================
  report: {
    getDashboard: () => ipcRenderer.invoke('report:getDashboard'),
    getProcurementByTier: (filters) => ipcRenderer.invoke('report:getProcurementByTier', filters),
    getProcurementByStatus: (filters) => ipcRenderer.invoke('report:getProcurementByStatus', filters),
    getProcurementByUnit: (filters) => ipcRenderer.invoke('report:getProcurementByUnit', filters),
    getMonthlyTrend: (year) => ipcRenderer.invoke('report:getMonthlyTrend', year),
    getVendorPerformance: (filters) => ipcRenderer.invoke('report:getVendorPerformance', filters),
    getBudgetUtilization: (fiscalYear) => ipcRenderer.invoke('report:getBudgetUtilization', fiscalYear),
    getContractStatus: (filters) => ipcRenderer.invoke('report:getContractStatus', filters),
    getPaymentStatus: (filters) => ipcRenderer.invoke('report:getPaymentStatus', filters),
    getOverdueItems: () => ipcRenderer.invoke('report:getOverdueItems'),
    getActivityLog: (filters) => ipcRenderer.invoke('report:getActivityLog', filters),
    exportToCsv: (reportType, filters) => ipcRenderer.invoke('report:exportToCsv', { reportType, filters })
  },

  // ==================== User API ====================
  user: {
    create: (data) => ipcRenderer.invoke('user:create', data),
    getAll: (filters) => ipcRenderer.invoke('user:getAll', filters),
    getById: (id) => ipcRenderer.invoke('user:getById', id),
    getByEmail: (email) => ipcRenderer.invoke('user:getByEmail', email),
    update: (id, data) => ipcRenderer.invoke('user:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('user:delete', id),
    deactivate: (id) => ipcRenderer.invoke('user:deactivate', id),
    activate: (id) => ipcRenderer.invoke('user:activate', id),
    authenticate: (email, password) => ipcRenderer.invoke('user:authenticate', { email, password }),
    changePassword: (id, currentPassword, newPassword) => ipcRenderer.invoke('user:changePassword', { id, currentPassword, newPassword }),
    getByRole: (role) => ipcRenderer.invoke('user:getByRole', role),
    getByUnit: (unit) => ipcRenderer.invoke('user:getByUnit', unit),
    getActivity: (id, limit) => ipcRenderer.invoke('user:getActivity', { id, limit }),
    getStats: () => ipcRenderer.invoke('user:getStats')
  },

  // ==================== Pegawai (Employee) API ====================
  pegawai: {
    list: (options) => ipcRenderer.invoke('pegawai:list', options),
    get: (id) => ipcRenderer.invoke('pegawai:get', id),
    getByNip: (nip) => ipcRenderer.invoke('pegawai:get-by-nip', nip),
    create: (data) => ipcRenderer.invoke('pegawai:create', data),
    update: (id, data) => ipcRenderer.invoke('pegawai:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('pegawai:delete', id),
    search: (query) => ipcRenderer.invoke('pegawai:search', query),
    importCsv: (csvData) => ipcRenderer.invoke('pegawai:import-csv', csvData),
    exportCsv: () => ipcRenderer.invoke('pegawai:export-csv')
  },

  // ==================== Satker (Work Unit) API ====================
  satker: {
    list: (options) => ipcRenderer.invoke('satker:list', options),
    get: (id) => ipcRenderer.invoke('satker:get', id),
    getByKode: (kode) => ipcRenderer.invoke('satker:get-by-kode', kode),
    create: (data) => ipcRenderer.invoke('satker:create', data),
    update: (id, data) => ipcRenderer.invoke('satker:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('satker:delete', id),
    search: (query) => ipcRenderer.invoke('satker:search', query),
    getAvailablePegawai: () => ipcRenderer.invoke('satker:get-available-pegawai'),
    setOfficial: (satker_id, officialType, nip) => ipcRenderer.invoke('satker:set-official', { satker_id, officialType, nip })
  },

  // ==================== DIPA (Budget) API ====================
  dipa: {
    list: (options) => ipcRenderer.invoke('dipa:list', options),
    get: (id) => ipcRenderer.invoke('dipa:get', id),
    getSummary: (tahun) => ipcRenderer.invoke('dipa:get-summary', tahun),
    create: (data) => ipcRenderer.invoke('dipa:create', data),
    update: (id, data) => ipcRenderer.invoke('dipa:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('dipa:delete', id),
    importCsv: (csvData) => ipcRenderer.invoke('dipa:import-csv', csvData),
    exportCsv: (filters) => ipcRenderer.invoke('dipa:export-csv', filters)
  },

  // ==================== Legacy DB API (backward compatibility) ====================
  db: {
    createRequest: (data) => ipcRenderer.invoke('db:createRequest', data),
    getRequests: (filters) => ipcRenderer.invoke('db:getRequests', filters),
    getRequestById: (id) => ipcRenderer.invoke('db:getRequestById', id),
    updateRequest: (id, updates) => ipcRenderer.invoke('db:updateRequest', { id, updates }),
    deleteRequest: (id) => ipcRenderer.invoke('db:deleteRequest', id),

    createVendor: (data) => ipcRenderer.invoke('db:createVendor', data),
    getVendors: (filters) => ipcRenderer.invoke('db:getVendors', filters),
    getVendorById: (id) => ipcRenderer.invoke('db:getVendorById', id),
    updateVendor: (id, data) => ipcRenderer.invoke('db:updateVendor', { id, data }),

    createContract: (data) => ipcRenderer.invoke('db:createContract', data),
    getContracts: (filters) => ipcRenderer.invoke('db:getContracts', filters),
    getContractById: (id) => ipcRenderer.invoke('db:getContractById', id),

    createPayment: (data) => ipcRenderer.invoke('db:createPayment', data),
    getPayments: (filters) => ipcRenderer.invoke('db:getPayments', filters),

    getStats: () => ipcRenderer.invoke('db:getStats'),
    getDashboardStats: () => ipcRenderer.invoke('db:getDashboardStats'),

    backup: () => ipcRenderer.invoke('db:backup'),
    restore: (backupPath) => ipcRenderer.invoke('db:restore', backupPath),
    getBackupHistory: (limit) => ipcRenderer.invoke('db:getBackupHistory', limit),
    getCurrentVersion: () => ipcRenderer.invoke('db:getCurrentVersion')
  },

  // ==================== App API ====================
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPath: (name) => ipcRenderer.invoke('app:getPath', name),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
    isDev: () => ipcRenderer.invoke('app:isDev')
  },

  // ==================== Dialog API ====================
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
    showMessageBox: (options) => ipcRenderer.invoke('dialog:showMessageBox', options)
  },

  // ==================== Window API ====================
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },

  // ==================== Logging API ====================
  log: {
    write: (level, message, meta) => ipcRenderer.invoke('log:write', { level, message, meta }),
    error: (message, meta) => ipcRenderer.invoke('log:write', { level: 'error', message, meta }),
    warn: (message, meta) => ipcRenderer.invoke('log:write', { level: 'warn', message, meta }),
    info: (message, meta) => ipcRenderer.invoke('log:write', { level: 'info', message, meta }),
    debug: (message, meta) => ipcRenderer.invoke('log:write', { level: 'debug', message, meta }),
    getFiles: () => ipcRenderer.invoke('log:getFiles'),
    getContents: (type, lines) => ipcRenderer.invoke('log:getContents', { type, lines })
  }
  });

  console.log('✅ contextBridge.exposeInMainWorld completed successfully');
  console.log('✅ electronAPI should now be available in renderer');

} catch (error) {
  console.error('❌❌❌ CRITICAL ERROR IN PRELOAD SCRIPT ❌❌❌');
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  
  // Try to expose error info to renderer
  try {
    if (typeof window !== 'undefined') {
      window.PRELOAD_ERROR = {
        message: error.message,
        stack: error.stack
      };
    }
  } catch (e) {
    console.error('Failed to expose preload error:', e);
  }
}

// Log that preload is complete
console.log('=== PRELOAD SCRIPT LOADED ===');
console.log('Available APIs: request, vendor, contract, payment, document, report, user, pegawai, satker, dipa, db, app, dialog, window, log');
