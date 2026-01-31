<script setup>
import { ref } from 'vue';

const loading = ref(false);
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Master SBM</h1>
        <p class="text-gray-500">Kelola data Standar Biaya Masukan</p>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-12 text-center">
      <div class="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-700 mb-2">Modul SBM</h3>
      <p class="text-gray-500 mb-4">Fitur ini akan tersedia pada fase berikutnya.</p>
      <p class="text-sm text-gray-400">
        Modul ini akan mencakup pengelolaan tarif uang harian, transport, dan honorarium sesuai PMK SBM.
      </p>
    </div>
  </div>
</template>
