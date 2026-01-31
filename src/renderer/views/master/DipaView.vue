<script setup>
import { ref } from 'vue';

const loading = ref(false);
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Master DIPA</h1>
        <p class="text-gray-500">Kelola data Daftar Isian Pelaksanaan Anggaran</p>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-12 text-center">
      <div class="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-700 mb-2">Modul DIPA</h3>
      <p class="text-gray-500 mb-4">Fitur ini akan tersedia pada fase berikutnya.</p>
      <p class="text-sm text-gray-400">
        Modul ini akan mencakup pengelolaan DIPA, revisi DIPA, dan item-item anggaran dengan POK bulanan.
      </p>
    </div>
  </div>
</template>
