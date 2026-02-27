/**
 * Sync Engine
 * Handles synchronization between mobile app and server
 * Supports offline-first architecture with conflict resolution
 */

import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import mobileDatabase from '../mobile/database';

class SyncEngine {
  constructor() {
    this.serverUrl = null;
    this.isOnline = false;
    this.isSyncing = false;
    this.syncInterval = null;
    this.listeners = new Set();
    this.lastSyncTime = null;
    this.authToken = null;
  }

  // Initialize sync engine
  async initialize(serverUrl) {
    this.serverUrl = serverUrl;

    // Load saved settings
    const savedUrl = await Preferences.get({ key: 'syncServerUrl' });
    if (savedUrl.value) {
      this.serverUrl = savedUrl.value;
    }

    const savedToken = await Preferences.get({ key: 'authToken' });
    if (savedToken.value) {
      this.authToken = savedToken.value;
    }

    // Check initial network status
    const status = await Network.getStatus();
    this.isOnline = status.connected;

    // Listen for network changes
    Network.addListener('networkStatusChange', async (status) => {
      const wasOffline = !this.isOnline;
      this.isOnline = status.connected;

      console.log('Network status changed:', status.connected ? 'Online' : 'Offline');

      // If we just came online, trigger sync
      if (wasOffline && this.isOnline) {
        console.log('Back online - triggering sync');
        await this.syncAll();
      }

      this.notifyListeners('networkChange', { isOnline: this.isOnline });
    });

    // Start periodic sync (every 5 minutes when online)
    this.startPeriodicSync();

    console.log('Sync engine initialized', { serverUrl: this.serverUrl, isOnline: this.isOnline });
  }

  // Set server URL
  async setServerUrl(url) {
    this.serverUrl = url;
    await Preferences.set({ key: 'syncServerUrl', value: url });
  }

  // Set auth token
  async setAuthToken(token) {
    this.authToken = token;
    await Preferences.set({ key: 'authToken', value: token });
  }

  // Start periodic sync
  startPeriodicSync(intervalMs = 5 * 60 * 1000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (this.isOnline && !this.isSyncing) {
        await this.syncAll();
      }
    }, intervalMs);
  }

  // Stop periodic sync
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Add event listener
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  // Main sync function
  async syncAll() {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping');
      return { success: false, reason: 'already_syncing' };
    }

    if (!this.isOnline) {
      console.log('Offline, cannot sync');
      return { success: false, reason: 'offline' };
    }

    if (!this.serverUrl) {
      console.log('No server URL configured');
      return { success: false, reason: 'no_server' };
    }

    this.isSyncing = true;
    this.notifyListeners('syncStart', {});

    try {
      // Step 1: Push local changes to server
      const pushResult = await this.pushChanges();

      // Step 2: Pull changes from server
      const pullResult = await this.pullChanges();

      // Step 3: Clean up sync queue
      await mobileDatabase.cleanupSyncQueue();

      this.lastSyncTime = new Date();
      await Preferences.set({
        key: 'lastSyncTime',
        value: this.lastSyncTime.toISOString()
      });

      const result = {
        success: true,
        pushed: pushResult,
        pulled: pullResult,
        timestamp: this.lastSyncTime
      };

      this.notifyListeners('syncComplete', result);
      return result;
    } catch (error) {
      console.error('Sync error:', error);
      this.notifyListeners('syncError', { error: error.message });
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  // Push local changes to server
  async pushChanges() {
    const pending = await mobileDatabase.getPendingSyncs();

    if (!pending.success || pending.data.length === 0) {
      return { count: 0, errors: [] };
    }

    const results = {
      count: 0,
      errors: []
    };

    for (const item of pending.data) {
      try {
        const response = await this.pushItem(item);

        if (response.success) {
          await mobileDatabase.markSynced(item.id);
          results.count++;
        } else {
          await mobileDatabase.markSyncFailed(item.id, response.error);
          results.errors.push({ id: item.id, error: response.error });
        }
      } catch (error) {
        await mobileDatabase.markSyncFailed(item.id, error.message);
        results.errors.push({ id: item.id, error: error.message });
      }
    }

    return results;
  }

  // Push single item to server
  async pushItem(item) {
    const url = `${this.serverUrl}/api/sync/push`;
    const data = item.data ? JSON.parse(item.data) : null;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({
        table: item.table_name,
        recordId: item.record_id,
        action: item.action,
        data: data,
        timestamp: item.created_at
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return await response.json();
  }

  // Pull changes from server
  async pullChanges() {
    const tables = ['satker', 'pegawai', 'dipa', 'dipa_item', 'surat_tugas', 'surat_tugas_pelaksana'];
    const results = {
      count: 0,
      tables: {}
    };

    for (const table of tables) {
      try {
        const lastSync = await this.getLastSyncTime(table);
        const changes = await this.fetchChanges(table, lastSync);

        if (changes.success && changes.data.length > 0) {
          const applied = await this.applyChanges(table, changes.data);
          results.tables[table] = applied;
          results.count += applied;

          // Update last sync time
          await this.setLastSyncTime(table, new Date());
        }
      } catch (error) {
        console.error(`Error pulling ${table}:`, error);
        results.tables[table] = { error: error.message };
      }
    }

    return results;
  }

  // Fetch changes from server
  async fetchChanges(table, since) {
    const url = `${this.serverUrl}/api/sync/pull/${table}`;
    const params = since ? `?since=${since.toISOString()}` : '';

    const response = await fetch(url + params, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${table}: ${response.statusText}`);
    }

    return await response.json();
  }

  // Apply changes to local database
  async applyChanges(table, changes) {
    let count = 0;

    for (const change of changes) {
      try {
        if (change.action === 'DELETE') {
          await mobileDatabase.run(
            `DELETE FROM ${table} WHERE _server_id = ?`,
            [change.id]
          );
        } else {
          // Upsert - insert or update
          const exists = await mobileDatabase.query(
            `SELECT id FROM ${table} WHERE _server_id = ?`,
            [change.id]
          );

          if (exists.success && exists.data.length > 0) {
            // Update
            const setClauses = [];
            const values = [];

            for (const [key, value] of Object.entries(change.data)) {
              if (key !== 'id' && key !== '_server_id') {
                setClauses.push(`${key} = ?`);
                values.push(value);
              }
            }

            values.push(change.id);
            await mobileDatabase.run(
              `UPDATE ${table} SET ${setClauses.join(', ')}, _synced = 1 WHERE _server_id = ?`,
              values
            );
          } else {
            // Insert
            const columns = ['_server_id', '_synced'];
            const placeholders = ['?', '1'];
            const values = [change.id];

            for (const [key, value] of Object.entries(change.data)) {
              if (key !== 'id') {
                columns.push(key);
                placeholders.push('?');
                values.push(value);
              }
            }

            await mobileDatabase.run(
              `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
              values
            );
          }
        }

        count++;
      } catch (error) {
        console.error(`Error applying change to ${table}:`, error);
      }
    }

    return count;
  }

  // Get last sync time for table
  async getLastSyncTime(table) {
    const result = await mobileDatabase.query(
      `SELECT last_sync FROM sync_meta WHERE table_name = ?`,
      [table]
    );

    if (result.success && result.data.length > 0 && result.data[0].last_sync) {
      return new Date(result.data[0].last_sync);
    }

    return null;
  }

  // Set last sync time for table
  async setLastSyncTime(table, time) {
    await mobileDatabase.run(
      `INSERT OR REPLACE INTO sync_meta (table_name, last_sync, sync_version)
       VALUES (?, ?, COALESCE((SELECT sync_version FROM sync_meta WHERE table_name = ?), 0) + 1)`,
      [table, time.toISOString(), table]
    );
  }

  // Check if server is reachable
  async checkServerHealth() {
    if (!this.serverUrl) return false;

    try {
      const response = await fetch(`${this.serverUrl}/api/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Get sync status
  async getSyncStatus() {
    const lastSync = await Preferences.get({ key: 'lastSyncTime' });
    const pending = await mobileDatabase.getPendingSyncs();

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: lastSync.value ? new Date(lastSync.value) : null,
      pendingChanges: pending.success ? pending.data.length : 0,
      serverUrl: this.serverUrl,
      serverReachable: await this.checkServerHealth()
    };
  }

  // Force full sync (download all data)
  async forceFullSync() {
    // Clear sync timestamps to force full download
    await mobileDatabase.run(`DELETE FROM sync_meta`);
    return await this.syncAll();
  }
}

// Singleton instance
const syncEngine = new SyncEngine();

export default syncEngine;
export { SyncEngine };
