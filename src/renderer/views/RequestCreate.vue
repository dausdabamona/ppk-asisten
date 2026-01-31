<script setup>
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const tier = computed(() => route.params.tier || 'tier1');

const form = ref({
  item_name: '',
  description: '',
  specifications: '',
  quantity: 1,
  estimated_value: '',
  budget_code: '',
  unit: '',
  urgency: 'normal'
});

const loading = ref(false);
const error = ref('');

const tierConfig = {
  tier1: { max: 10000000, label: 'Tier 1 (< Rp 10 Juta)', color: 'blue' },
  tier2: { min: 10000000, max: 50000000, label: 'Tier 2 (Rp 10-50 Juta)', color: 'green' },
  tier3: { min: 50000000, max: 200000000, label: 'Tier 3 (> Rp 50 Juta)', color: 'purple' }
};

const currentTierConfig = computed(() => tierConfig[tier.value] || tierConfig.tier1);

const validateValue = () => {
  const value = Number(form.value.estimated_value);
  const config = currentTierConfig.value;

  if (config.max && value >= config.max) {
    return `Nilai harus kurang dari Rp ${config.max.toLocaleString('id-ID')}`;
  }
  if (config.min && value < config.min) {
    return `Nilai harus minimal Rp ${config.min.toLocaleString('id-ID')}`;
  }
  return null;
};

const submit = async () => {
  error.value = '';

  const valueError = validateValue();
  if (valueError) {
    error.value = valueError;
    return;
  }

  if (!form.value.item_name || !form.value.estimated_value || !form.value.budget_code || !form.value.unit) {
    error.value = 'Mohon lengkapi semua field yang wajib diisi';
    return;
  }

  loading.value = true;

  try {
    const user = JSON.parse(localStorage.getItem('ppk_user') || '{}');

    const result = await window.electronAPI?.request?.create({
      ...form.value,
      tier: tier.value,
      requester_id: user.id || 'default-user',
      estimated_value: Number(form.value.estimated_value)
    });

    if (result?.id) {
      router.push(`/requests/${result.id}`);
    }
  } catch (err) {
    error.value = 'Gagal membuat permintaan: ' + (err.message || 'Unknown error');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="p-6">
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center mb-6">
        <router-link to="/requests" class="text-gray-500 hover:text-gray-700 mr-4">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </router-link>
        <h1 class="text-2xl font-bold text-gray-800">Buat Permintaan Pengadaan</h1>
      </div>

      <!-- Tier Selection -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">Pilih Kategori</h2>
        <div class="grid grid-cols-3 gap-4">
          <router-link
            v-for="(config, key) in tierConfig"
            :key="key"
            :to="`/requests/create/${key}`"
            :class="[
              'p-4 rounded-lg border-2 text-center transition',
              tier === key
                ? `border-${config.color}-500 bg-${config.color}-50`
                : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <span :class="['font-semibold', tier === key ? `text-${config.color}-600` : 'text-gray-700']">
              {{ config.label }}
            </span>
          </router-link>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="submit" class="bg-white rounded-lg shadow p-6">
        <div class="space-y-6">
          <!-- Item Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Nama Barang/Jasa <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.item_name"
              type="text"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Pengadaan ATK Kantor"
              required
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea
              v-model="form.description"
              rows="3"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Jelaskan kebutuhan pengadaan..."
            ></textarea>
          </div>

          <!-- Specifications -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Spesifikasi Teknis</label>
            <textarea
              v-model="form.specifications"
              rows="3"
              class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Detail spesifikasi yang dibutuhkan..."
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <!-- Quantity -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
              <input
                v-model="form.quantity"
                type="number"
                min="1"
                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Estimated Value -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Perkiraan Nilai (Rp) <span class="text-red-500">*</span>
              </label>
              <input
                v-model="form.estimated_value"
                type="number"
                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="5000000"
                required
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <!-- Budget Code -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Kode Anggaran <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.budget_code"
                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Pilih Kode Anggaran</option>
                <option value="5211">5211 - Belanja Barang Operasional</option>
                <option value="5212">5212 - Belanja Barang Non Operasional</option>
                <option value="5221">5221 - Belanja Jasa</option>
                <option value="5231">5231 - Belanja Pemeliharaan</option>
                <option value="5311">5311 - Belanja Modal Peralatan</option>
              </select>
            </div>

            <!-- Unit -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Unit Kerja <span class="text-red-500">*</span>
              </label>
              <select
                v-model="form.unit"
                class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Pilih Unit</option>
                <option value="TU">Tata Usaha</option>
                <option value="Akademik">Akademik</option>
                <option value="Kemahasiswaan">Kemahasiswaan</option>
                <option value="Keuangan">Keuangan</option>
                <option value="Umum">Bagian Umum</option>
              </select>
            </div>
          </div>

          <!-- Urgency -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Urgensi</label>
            <div class="flex space-x-4">
              <label class="flex items-center">
                <input v-model="form.urgency" type="radio" value="normal" class="mr-2" />
                <span>Normal</span>
              </label>
              <label class="flex items-center">
                <input v-model="form.urgency" type="radio" value="urgent" class="mr-2" />
                <span class="text-yellow-600">Urgent</span>
              </label>
              <label class="flex items-center">
                <input v-model="form.urgency" type="radio" value="very_urgent" class="mr-2" />
                <span class="text-red-600">Sangat Urgent</span>
              </label>
            </div>
          </div>

          <!-- Error -->
          <div v-if="error" class="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
            {{ error }}
          </div>

          <!-- Submit -->
          <div class="flex justify-end space-x-4">
            <router-link
              to="/requests"
              class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Batal
            </router-link>
            <button
              type="submit"
              :disabled="loading"
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {{ loading ? 'Menyimpan...' : 'Simpan' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
