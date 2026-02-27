/**
 * Mobile App Update Service
 * Checks for updates and handles in-app update downloads
 */

import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

class UpdateService {
  constructor() {
    this.serverUrl = null;
    this.currentVersion = '1.0.0';
    this.latestVersion = null;
    this.updateAvailable = false;
    this.downloadUrl = null;
    this.listeners = new Set();
    this.checkInterval = null;
  }

  async initialize(serverUrl) {
    this.serverUrl = serverUrl;

    // Get current app version
    if (Capacitor.isNativePlatform()) {
      const info = await App.getInfo();
      this.currentVersion = info.version;
    }

    // Load saved server URL
    const savedUrl = await Preferences.get({ key: 'updateServerUrl' });
    if (savedUrl.value) {
      this.serverUrl = savedUrl.value;
    }

    // Check for updates on init
    await this.checkForUpdates();

    // Start periodic check (every hour)
    this.startPeriodicCheck();

    console.log('Update service initialized', {
      serverUrl: this.serverUrl,
      currentVersion: this.currentVersion
    });
  }

  // Set server URL
  async setServerUrl(url) {
    this.serverUrl = url;
    await Preferences.set({ key: 'updateServerUrl', value: url });
  }

  // Add listener for update events
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify listeners
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Update listener error:', error);
      }
    });
  }

  // Start periodic update check
  startPeriodicCheck(intervalMs = 60 * 60 * 1000) { // 1 hour
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      const status = await Network.getStatus();
      if (status.connected) {
        await this.checkForUpdates();
      }
    }, intervalMs);
  }

  // Stop periodic check
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Check for updates
  async checkForUpdates() {
    if (!this.serverUrl) {
      console.log('No update server configured');
      return { available: false };
    }

    try {
      const response = await fetch(`${this.serverUrl}/api/app/version`, {
        method: 'GET',
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error('Failed to check for updates');
      }

      const result = await response.json();

      if (result.success && result.data.available) {
        this.latestVersion = result.data.version;
        this.downloadUrl = `${this.serverUrl}${result.data.downloadUrl}`;

        // Compare versions
        this.updateAvailable = this.compareVersions(this.latestVersion, this.currentVersion) > 0;

        if (this.updateAvailable) {
          this.notifyListeners('updateAvailable', {
            currentVersion: this.currentVersion,
            latestVersion: this.latestVersion,
            downloadUrl: this.downloadUrl
          });

          // Save update info
          await Preferences.set({
            key: 'pendingUpdate',
            value: JSON.stringify({
              version: this.latestVersion,
              downloadUrl: this.downloadUrl,
              checkedAt: new Date().toISOString()
            })
          });
        }

        return {
          available: this.updateAvailable,
          currentVersion: this.currentVersion,
          latestVersion: this.latestVersion,
          downloadUrl: this.downloadUrl
        };
      }

      return { available: false, currentVersion: this.currentVersion };
    } catch (error) {
      console.error('Update check failed:', error);
      return { available: false, error: error.message };
    }
  }

  // Compare semantic versions
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }

    return 0;
  }

  // Download and install update
  async downloadUpdate() {
    if (!this.updateAvailable || !this.downloadUrl) {
      return { success: false, error: 'No update available' };
    }

    try {
      this.notifyListeners('downloadStarted', {
        version: this.latestVersion,
        url: this.downloadUrl
      });

      // Open browser to download APK
      // Android will handle the APK installation
      await Browser.open({
        url: this.downloadUrl,
        presentationStyle: 'popover'
      });

      this.notifyListeners('downloadCompleted', {
        version: this.latestVersion
      });

      return { success: true };
    } catch (error) {
      console.error('Download failed:', error);
      this.notifyListeners('downloadFailed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // Get update status
  async getUpdateStatus() {
    const pending = await Preferences.get({ key: 'pendingUpdate' });

    return {
      currentVersion: this.currentVersion,
      latestVersion: this.latestVersion,
      updateAvailable: this.updateAvailable,
      downloadUrl: this.downloadUrl,
      pendingUpdate: pending.value ? JSON.parse(pending.value) : null
    };
  }

  // Dismiss update notification
  async dismissUpdate() {
    await Preferences.remove({ key: 'pendingUpdate' });
    this.updateAvailable = false;
    this.notifyListeners('updateDismissed', {});
  }
}

// Singleton instance
const updateService = new UpdateService();

export default updateService;
export { UpdateService };
