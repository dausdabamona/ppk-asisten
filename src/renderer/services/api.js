/**
 * Unified API Service
 * Provides a unified interface for both Electron and Mobile (Capacitor)
 * Automatically detects platform and uses appropriate backend
 */

import { Capacitor } from '@capacitor/core';
import mobileDatabase from './mobile/database';
import syncEngine from './sync/syncEngine';

// Detect platform
const platform = Capacitor.isNativePlatform() ? 'mobile' : 'electron';

console.log('API Service initialized for platform:', platform);

/**
 * Creates API methods that work on both platforms
 */
function createApi(tableName, options = {}) {
  const {
    idField = 'id',
    searchFields = ['nama'],
    defaultOrderBy = 'created_at DESC'
  } = options;

  if (platform === 'electron') {
    // Use Electron IPC
    return createElectronApi(tableName, options);
  } else {
    // Use mobile SQLite
    return createMobileApi(tableName, options);
  }
}

/**
 * Electron API - uses window.electronAPI
 */
function createElectronApi(tableName, options) {
  const api = window.electronAPI?.[tableName];

  if (!api) {
    console.warn(`Electron API for ${tableName} not found, using fallback`);
    return createFallbackApi(tableName);
  }

  return {
    list: (opts) => api.list(opts),
    get: (id) => api.get(id),
    create: (data) => api.create(data),
    update: (id, data) => api.update(id, data),
    delete: (id) => api.delete(id),
    search: api.search ? (query) => api.search(query) : null
  };
}

/**
 * Mobile API - uses local SQLite with sync
 */
function createMobileApi(tableName, options = {}) {
  const {
    idField = 'id',
    searchFields = ['nama'],
    defaultOrderBy = 'created_at DESC'
  } = options;

  return {
    // List records with filtering and pagination
    async list(opts = {}) {
      const { page = 1, limit = 20, search, filters = {}, orderBy } = opts;
      const offset = (page - 1) * limit;

      let sql = `SELECT * FROM ${tableName} WHERE 1=1`;
      const params = [];

      // Search
      if (search && searchFields.length > 0) {
        const searchConditions = searchFields.map(f => `${f} LIKE ?`).join(' OR ');
        sql += ` AND (${searchConditions})`;
        searchFields.forEach(() => params.push(`%${search}%`));
      }

      // Filters
      for (const [key, value] of Object.entries(filters)) {
        if (value !== null && value !== undefined && value !== '') {
          sql += ` AND ${key} = ?`;
          params.push(value);
        }
      }

      // Order
      sql += ` ORDER BY ${orderBy || defaultOrderBy}`;

      // Pagination
      sql += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const result = await mobileDatabase.query(sql, params);

      // Get total count
      let countSql = `SELECT COUNT(*) as total FROM ${tableName} WHERE 1=1`;
      const countParams = [];

      if (search && searchFields.length > 0) {
        const searchConditions = searchFields.map(f => `${f} LIKE ?`).join(' OR ');
        countSql += ` AND (${searchConditions})`;
        searchFields.forEach(() => countParams.push(`%${search}%`));
      }

      for (const [key, value] of Object.entries(filters)) {
        if (value !== null && value !== undefined && value !== '') {
          countSql += ` AND ${key} = ?`;
          countParams.push(value);
        }
      }

      const countResult = await mobileDatabase.query(countSql, countParams);
      const total = countResult.success ? countResult.data[0]?.total || 0 : 0;

      return {
        success: result.success,
        data: result.data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    },

    // Get single record by ID
    async get(id) {
      const result = await mobileDatabase.query(
        `SELECT * FROM ${tableName} WHERE ${idField} = ?`,
        [id]
      );

      if (result.success && result.data.length > 0) {
        return { success: true, data: result.data[0] };
      }

      return { success: false, error: 'Record not found' };
    },

    // Create new record
    async create(data) {
      const columns = Object.keys(data).filter(k => !k.startsWith('_'));
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(k => data[k]);

      const result = await mobileDatabase.run(
        `INSERT INTO ${tableName} (${columns.join(', ')}, _synced) VALUES (${placeholders}, 0)`,
        values
      );

      if (result.success) {
        const id = result.data.lastInsertRowid;

        // Queue for sync
        await mobileDatabase.queueSync(tableName, id, 'INSERT', data);

        // Trigger sync if online
        syncEngine.syncAll().catch(console.error);

        return { success: true, data: { id, ...data } };
      }

      return result;
    },

    // Update record
    async update(id, data) {
      const columns = Object.keys(data).filter(k => !k.startsWith('_'));
      const setClauses = columns.map(k => `${k} = ?`).join(', ');
      const values = [...columns.map(k => data[k]), id];

      const result = await mobileDatabase.run(
        `UPDATE ${tableName} SET ${setClauses}, _synced = 0, updated_at = CURRENT_TIMESTAMP WHERE ${idField} = ?`,
        values
      );

      if (result.success) {
        // Queue for sync
        await mobileDatabase.queueSync(tableName, id, 'UPDATE', data);

        // Trigger sync if online
        syncEngine.syncAll().catch(console.error);

        return { success: true, data: { id, ...data } };
      }

      return result;
    },

    // Delete record
    async delete(id) {
      // First get the record to save for sync
      const existing = await this.get(id);

      const result = await mobileDatabase.run(
        `DELETE FROM ${tableName} WHERE ${idField} = ?`,
        [id]
      );

      if (result.success) {
        // Queue for sync
        await mobileDatabase.queueSync(tableName, id, 'DELETE', existing.data);

        // Trigger sync if online
        syncEngine.syncAll().catch(console.error);

        return { success: true };
      }

      return result;
    },

    // Search records
    async search(query) {
      if (!query || !searchFields.length) {
        return this.list({ limit: 50 });
      }

      const conditions = searchFields.map(f => `${f} LIKE ?`).join(' OR ');
      const params = searchFields.map(() => `%${query}%`);

      const result = await mobileDatabase.query(
        `SELECT * FROM ${tableName} WHERE ${conditions} ORDER BY ${defaultOrderBy} LIMIT 50`,
        params
      );

      return result;
    }
  };
}

/**
 * Fallback API - for when Electron API is not available
 */
function createFallbackApi(tableName) {
  console.log(`Creating fallback API for ${tableName}`);

  return {
    list: async () => ({ success: false, error: 'API not available' }),
    get: async () => ({ success: false, error: 'API not available' }),
    create: async () => ({ success: false, error: 'API not available' }),
    update: async () => ({ success: false, error: 'API not available' }),
    delete: async () => ({ success: false, error: 'API not available' }),
    search: async () => ({ success: false, error: 'API not available' })
  };
}

// Export platform-specific APIs
export const satkerApi = createApi('satker', {
  searchFields: ['kode', 'nama']
});

export const pegawaiApi = createApi('pegawai', {
  searchFields: ['nama', 'nip', 'jabatan']
});

export const dipaApi = createApi('dipa', {
  searchFields: ['nomor_dipa']
});

export const dipaItemApi = createApi('dipa_item', {
  searchFields: ['kode_akun', 'nama_akun', 'uraian', 'mak']
});

export const suratTugasApi = createApi('surat_tugas', {
  searchFields: ['nomor', 'maksud_tujuan', 'kota_tujuan']
});

export const suratTugasPelaksanaApi = createApi('surat_tugas_pelaksana', {
  searchFields: []
});

// Export utility functions
export { platform, syncEngine };

// Initialize mobile database and sync if on mobile
export async function initializeMobileServices(serverUrl) {
  if (platform === 'mobile') {
    await mobileDatabase.initialize();
    await syncEngine.initialize(serverUrl);
    console.log('Mobile services initialized');
  }
}

// Export sync status
export async function getSyncStatus() {
  if (platform === 'mobile') {
    return await syncEngine.getSyncStatus();
  }
  return { isOnline: true, isSyncing: false, pendingChanges: 0 };
}

// Export manual sync trigger
export async function triggerSync() {
  if (platform === 'mobile') {
    return await syncEngine.syncAll();
  }
  return { success: true, message: 'Electron does not need sync' };
}
