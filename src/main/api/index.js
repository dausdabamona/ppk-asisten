/**
 * API Module Index
 *
 * Central export point for all API modules
 * Handles database initialization for all APIs
 */

const requestApi = require('./requestApi');
const vendorApi = require('./vendorApi');
const contractApi = require('./contractApi');
const paymentApi = require('./paymentApi');
const documentApi = require('./documentApi');
const reportApi = require('./reportApi');
const userApi = require('./userApi');

// All API instances
const apis = {
  request: requestApi,
  vendor: vendorApi,
  contract: contractApi,
  payment: paymentApi,
  document: documentApi,
  report: reportApi,
  user: userApi
};

/**
 * Initialize all APIs with database instance
 */
function initializeApis(database) {
  for (const api of Object.values(apis)) {
    api.setDatabase(database);
  }
}

/**
 * API Route Definitions for IPC
 * Maps channel names to API methods
 */
const routes = {
  // Request routes
  'request:create': (data) => requestApi.create(data),
  'request:getAll': (filters) => requestApi.getAll(filters),
  'request:getById': (id) => requestApi.getById(id),
  'request:getWithDetails': (id) => requestApi.getWithDetails(id),
  'request:update': ({ id, data }) => requestApi.update(id, data),
  'request:delete': (id) => requestApi.delete(id),
  'request:submit': (id) => requestApi.submit(id),
  'request:approve': ({ id, approverId, comments }) => requestApi.approve(id, approverId, comments),
  'request:reject': ({ id, approverId, reason }) => requestApi.reject(id, approverId, reason),
  'request:cancel': ({ id, reason }) => requestApi.cancel(id, reason),
  'request:complete': (id) => requestApi.complete(id),
  'request:getStats': (filters) => requestApi.getStats(filters),

  // Vendor routes
  'vendor:create': (data) => vendorApi.create(data),
  'vendor:getAll': (filters) => vendorApi.getAll(filters),
  'vendor:getActive': (filters) => vendorApi.getActive(filters),
  'vendor:getById': (id) => vendorApi.getById(id),
  'vendor:getWithContracts': (id) => vendorApi.getWithContracts(id),
  'vendor:update': ({ id, data }) => vendorApi.update(id, data),
  'vendor:delete': (id) => vendorApi.delete(id),
  'vendor:deactivate': (id) => vendorApi.deactivate(id),
  'vendor:activate': (id) => vendorApi.activate(id),
  'vendor:updateRating': ({ id, rating, notes }) => vendorApi.updateRating(id, rating, notes),
  'vendor:search': (query) => vendorApi.search(query),
  'vendor:getTopPerformers': (minRating) => vendorApi.getTopPerformers(minRating),

  // Contract routes
  'contract:create': (data) => contractApi.create(data),
  'contract:getAll': (filters) => contractApi.getAll(filters),
  'contract:getById': (id) => contractApi.getById(id),
  'contract:getWithPayments': (id) => contractApi.getWithPayments(id),
  'contract:update': ({ id, data }) => contractApi.update(id, data),
  'contract:activate': ({ id, signedBy, signedDate }) => contractApi.activate(id, signedBy, signedDate),
  'contract:complete': (id) => contractApi.complete(id),
  'contract:terminate': ({ id, reason }) => contractApi.terminate(id, reason),
  'contract:getExpiring': (daysAhead) => contractApi.getExpiring(daysAhead),
  'contract:processExpired': () => contractApi.processExpired(),
  'contract:getByVendor': (vendorId) => contractApi.getByVendor(vendorId),
  'contract:getByRequest': (requestId) => contractApi.getByRequest(requestId),

  // Payment routes
  'payment:create': (data) => paymentApi.create(data),
  'payment:getAll': (filters) => paymentApi.getAll(filters),
  'payment:getById': (id) => paymentApi.getById(id),
  'payment:getByContract': (contractId) => paymentApi.getByContract(contractId),
  'payment:update': ({ id, data }) => paymentApi.update(id, data),
  'payment:process': ({ id, processedBy }) => paymentApi.process(id, processedBy),
  'payment:complete': ({ id, referenceNumber, paymentDate }) => paymentApi.complete(id, referenceNumber, paymentDate),
  'payment:fail': ({ id, reason }) => paymentApi.fail(id, reason),
  'payment:cancel': ({ id, reason }) => paymentApi.cancel(id, reason),
  'payment:retry': (id) => paymentApi.retry(id),
  'payment:getOverdue': () => paymentApi.getOverdue(),
  'payment:getUpcoming': (daysAhead) => paymentApi.getUpcoming(daysAhead),
  'payment:getContractStats': (contractId) => paymentApi.getContractPaymentStats(contractId),

  // Document routes
  'document:create': (data) => documentApi.create(data),
  'document:getAll': (filters) => documentApi.getAll(filters),
  'document:getByRequest': (requestId) => documentApi.getByRequest(requestId),
  'document:getByContract': (contractId) => documentApi.getByContract(contractId),
  'document:getByPayment': (paymentId) => documentApi.getByPayment(paymentId),
  'document:delete': (id) => documentApi.delete(id),
  'document:saveFile': ({ fileData, fileName, options }) => documentApi.saveFile(fileData, fileName, options),
  'document:generateRequestPdf': (requestId) => documentApi.generateRequestPdf(requestId),
  'document:generateContractPdf': (contractId) => documentApi.generateContractPdf(contractId),
  'document:generatePaymentVoucherPdf': (paymentId) => documentApi.generatePaymentVoucherPdf(paymentId),
  'document:getStorageStats': () => documentApi.getStorageStats(),

  // Report routes
  'report:getDashboard': () => reportApi.getDashboard(),
  'report:getProcurementByTier': (filters) => reportApi.getProcurementByTier(filters),
  'report:getProcurementByStatus': (filters) => reportApi.getProcurementByStatus(filters),
  'report:getProcurementByUnit': (filters) => reportApi.getProcurementByUnit(filters),
  'report:getMonthlyTrend': (year) => reportApi.getMonthlyTrend(year),
  'report:getVendorPerformance': (filters) => reportApi.getVendorPerformance(filters),
  'report:getBudgetUtilization': (fiscalYear) => reportApi.getBudgetUtilization(fiscalYear),
  'report:getContractStatus': (filters) => reportApi.getContractStatus(filters),
  'report:getPaymentStatus': (filters) => reportApi.getPaymentStatus(filters),
  'report:getOverdueItems': () => reportApi.getOverdueItems(),
  'report:getActivityLog': (filters) => reportApi.getActivityLog(filters),
  'report:exportToCsv': ({ reportType, filters }) => reportApi.exportToCsv(reportType, filters),

  // User routes
  'user:create': (data) => userApi.create(data),
  'user:getAll': (filters) => userApi.getAll(filters),
  'user:getById': (id) => userApi.getById(id),
  'user:getByEmail': (email) => userApi.getByEmail(email),
  'user:update': ({ id, data }) => userApi.update(id, data),
  'user:delete': (id) => userApi.delete(id),
  'user:deactivate': (id) => userApi.deactivate(id),
  'user:activate': (id) => userApi.activate(id),
  'user:authenticate': ({ email, password }) => userApi.authenticate(email, password),
  'user:changePassword': ({ id, currentPassword, newPassword }) => userApi.changePassword(id, currentPassword, newPassword),
  'user:getByRole': (role) => userApi.getByRole(role),
  'user:getByUnit': (unit) => userApi.getByUnit(unit),
  'user:getActivity': ({ id, limit }) => userApi.getActivity(id, limit),
  'user:getStats': () => userApi.getStats()
};

module.exports = {
  // Individual APIs
  requestApi,
  vendorApi,
  contractApi,
  paymentApi,
  documentApi,
  reportApi,
  userApi,

  // All APIs
  apis,

  // Initialization
  initializeApis,

  // Routes
  routes
};
