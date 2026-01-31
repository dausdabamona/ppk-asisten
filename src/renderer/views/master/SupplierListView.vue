<script setup>
import { ref } from 'vue';

const loading = ref(false);
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Master Supplier</h1>
        <p class="text-gray-500">Kelola data penyedia barang/jasa</p>
      </div>
    </div>

    <div class="bg-white rounded-lg shadow p-12 text-center">
      <div class="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-700 mb-2">Modul Supplier</h3>
      <p class="text-gray-500 mb-4">Fitur ini akan tersedia pada fase berikutnya.</p>
      <p class="text-sm text-gray-400">
        Modul ini akan mencakup pengelolaan data penyedia barang/jasa, termasuk NPWP, rekening bank, dan penilaian kinerja.
      </p>
    </div>
  </div>
</template>
