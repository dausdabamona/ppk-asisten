<script setup>
/**
 * SyncStatus Component
 * Shows sync status, pending changes, and handles sync actions
 */
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Capacitor } from '@capacitor/core';
import syncEngine from '../../services/sync/syncEngine';
import updateService from '../../services/mobile/updateService';

const props = defineProps({
  showDetails: {
    type: Boolean,
    default: false
  }
});

// State
const isOnline = ref(true);
const isSyncing = ref(false);
const pendingChanges = ref(0);
const lastSyncTime = ref(null);
const syncError = ref(null);
const updateAvailable = ref(false);
const latestVersion = ref(null);
const currentVersion = ref('1.0.0');
const showUpdateModal = ref(false);

// Computed
const isMobile = computed(() => Capacitor.isNativePlatform());

const syncStatusText = computed(() => {
  if (isSyncing.value) return 'Menyinkronkan...';
  if (!isOnline.value) return 'Offline';
  if (pendingChanges.value > 0) return `${pendingChanges.value} perubahan tertunda`;
  return 'Tersinkronisasi';
});

const syncStatusColor = computed(() => {
  if (isSyncing.value) return 'text-blue-600';
  if (!isOnline.value) return 'text-gray-500';
  if (pendingChanges.value > 0) return 'text-yellow-600';
  return 'text-green-600';
});

const lastSyncText = computed(() => {
  if (!lastSyncTime.value) return 'Belum pernah sinkron';

  const now = new Date();
  const diff = now - new Date(lastSyncTime.value);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  return `${days} hari lalu`;
});

// Methods
const fetchStatus = async () => {
  if (!isMobile.value) return;

  const status = await syncEngine.getSyncStatus();
  isOnline.value = status.isOnline;
  isSyncing.value = status.isSyncing;
  pendingChanges.value = status.pendingChanges;
  lastSyncTime.value = status.lastSyncTime;

  const updateStatus = await updateService.getUpdateStatus();
  updateAvailable.value = updateStatus.updateAvailable;
  latestVersion.value = updateStatus.latestVersion;
  currentVersion.value = updateStatus.currentVersion;
};

const triggerSync = async () => {
  if (!isMobile.value || isSyncing.value) return;

  syncError.value = null;
  const result = await syncEngine.syncAll();

  if (!result.success) {
    syncError.value = result.error || result.reason;
  }

  await fetchStatus();
};

const downloadUpdate = async () => {
  await updateService.downloadUpdate();
  showUpdateModal.value = false;
};

const dismissUpdate = async () => {
  await updateService.dismissUpdate();
  updateAvailable.value = false;
  showUpdateModal.value = false;
};

// Listeners
let unsubscribeSync = null;
let unsubscribeUpdate = null;

onMounted(async () => {
  if (!isMobile.value) return;

  await fetchStatus();

  // Listen for sync events
  unsubscribeSync = syncEngine.addListener((event, data) => {
    switch (event) {
      case 'syncStart':
        isSyncing.value = true;
        break;
      case 'syncComplete':
        isSyncing.value = false;
        lastSyncTime.value = data.timestamp;
        fetchStatus();
        break;
      case 'syncError':
        isSyncing.value = false;
        syncError.value = data.error;
        break;
      case 'networkChange':
        isOnline.value = data.isOnline;
        break;
    }
  });

  // Listen for update events
  unsubscribeUpdate = updateService.addListener((event, data) => {
    if (event === 'updateAvailable') {
      updateAvailable.value = true;
      latestVersion.value = data.latestVersion;
      showUpdateModal.value = true;
    }
  });
});

onUnmounted(() => {
  if (unsubscribeSync) unsubscribeSync();
  if (unsubscribeUpdate) unsubscribeUpdate();
});
</script>

<template>
  <div v-if="isMobile" class="sync-status">
    <!-- Compact Status Bar -->
    <div
      class="flex items-center justify-between px-4 py-2 bg-gray-100 border-b"
      :class="{ 'bg-yellow-50': pendingChanges > 0, 'bg-red-50': !isOnline }"
    >
      <div class="flex items-center space-x-2">
        <!-- Online/Offline indicator -->
        <span
          class="w-2 h-2 rounded-full"
          :class="isOnline ? 'bg-green-500' : 'bg-gray-400'"
        ></span>

        <!-- Status text -->
        <span class="text-sm" :class="syncStatusColor">
          {{ syncStatusText }}
        </span>

        <!-- Syncing spinner -->
        <svg
          v-if="isSyncing"
          class="w-4 h-4 animate-spin text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>

      <div class="flex items-center space-x-2">
        <!-- Last sync time -->
        <span class="text-xs text-gray-500">{{ lastSyncText }}</span>

        <!-- Sync button -->
        <button
          @click="triggerSync"
          :disabled="isSyncing || !isOnline"
          class="p-1 text-gray-600 hover:text-blue-600 disabled:opacity-50"
          title="Sinkronkan sekarang"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>

        <!-- Update badge -->
        <button
          v-if="updateAvailable"
          @click="showUpdateModal = true"
          class="px-2 py-0.5 text-xs bg-green-500 text-white rounded-full animate-pulse"
        >
          Update
        </button>
      </div>
    </div>

    <!-- Error message -->
    <div
      v-if="syncError"
      class="px-4 py-2 bg-red-100 text-red-700 text-sm"
    >
      Sync gagal: {{ syncError }}
      <button @click="syncError = null" class="ml-2 underline">Tutup</button>
    </div>

    <!-- Detailed Status (optional) -->
    <div v-if="showDetails" class="px-4 py-3 bg-white border-b space-y-2">
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span class="text-gray-500">Status:</span>
          <span class="ml-1 font-medium" :class="syncStatusColor">
            {{ isOnline ? 'Online' : 'Offline' }}
          </span>
        </div>
        <div>
          <span class="text-gray-500">Pending:</span>
          <span class="ml-1 font-medium">{{ pendingChanges }}</span>
        </div>
        <div>
          <span class="text-gray-500">Versi:</span>
          <span class="ml-1 font-medium">{{ currentVersion }}</span>
        </div>
        <div>
          <span class="text-gray-500">Sinkron:</span>
          <span class="ml-1 font-medium">{{ lastSyncText }}</span>
        </div>
      </div>
    </div>

    <!-- Update Modal -->
    <div
      v-if="showUpdateModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div class="bg-white rounded-lg shadow-xl w-80 p-6">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>

          <h3 class="text-lg font-semibold text-gray-900 mb-2">
            Update Tersedia
          </h3>

          <p class="text-gray-600 mb-4">
            Versi baru <span class="font-semibold">{{ latestVersion }}</span> tersedia.
            Versi Anda saat ini: {{ currentVersion }}
          </p>

          <div class="flex space-x-3">
            <button
              @click="dismissUpdate"
              class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Nanti
            </button>
            <button
              @click="downloadUpdate"
              class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sync-status {
  position: sticky;
  top: 0;
  z-index: 40;
}
</style>
