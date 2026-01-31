<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-primary-600 text-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <h1 class="text-2xl font-bold">PPK Assistant</h1>
            <span class="text-sm text-primary-100">v{{ appVersion }}</span>
          </div>
          <nav class="flex space-x-6">
            <button 
              @click="currentView = 'dashboard'"
              :class="['hover:text-primary-100 transition-colors', 
                       currentView === 'dashboard' ? 'font-bold' : '']"
            >
              Dashboard
            </button>
            <button 
              @click="currentView = 'tier1'"
              :class="['hover:text-primary-100 transition-colors',
                       currentView === 'tier1' ? 'font-bold' : '']"
            >
              Tier 1
            </button>
            <button
              @click="currentView = 'tier2'"
              :class="['hover:text-primary-100 transition-colors',
                       currentView === 'tier2' ? 'font-bold' : '']"
            >
              Tier 2
            </button>
            <button
              @click="currentView = 'tier3'"
              :class="['hover:text-primary-100 transition-colors',
                       currentView === 'tier3' ? 'font-bold' : '']"
            >
              Tier 3
            </button>
          </nav>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Dashboard View -->
      <div v-if="currentView === 'dashboard'" class="space-y-6">
        <h2 class="text-3xl font-bold">Dashboard</h2>
        
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="card">
            <h3 class="text-lg font-semibold text-gray-700">Total Requests</h3>
            <p class="text-4xl font-bold text-primary-600 mt-2">
              {{ stats.total }}
            </p>
          </div>
          <div class="card">
            <h3 class="text-lg font-semibold text-gray-700">Pending</h3>
            <p class="text-4xl font-bold text-yellow-600 mt-2">
              {{ stats.pending }}
            </p>
          </div>
          <div class="card">
            <h3 class="text-lg font-semibold text-gray-700">Completed</h3>
            <p class="text-4xl font-bold text-green-600 mt-2">
              {{ stats.completed }}
            </p>
          </div>
        </div>

        <!-- Recent Requests -->
        <div class="card">
          <h3 class="text-xl font-bold mb-4">Recent Requests</h3>
          
          <div v-if="loading" class="text-center py-8">
            <p class="text-gray-500">Loading...</p>
          </div>

          <div v-else-if="requests.length === 0" class="text-center py-8">
            <p class="text-gray-500">No requests yet</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Request #
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Item
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Value
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="request in requests" :key="request.id" class="hover:bg-gray-50">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ request.request_number }}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900">
                    {{ request.item_name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ formatCurrency(request.estimated_value) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="getStatusClass(request.status)">
                      {{ request.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ formatDate(request.created_at) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tier 1 View -->
      <div v-else-if="currentView === 'tier1'" class="space-y-6">
        <h2 class="text-3xl font-bold">Tier 1: Pengadaan < Rp 10 Juta</h2>
        
        <div class="card max-w-2xl">
          <form @submit.prevent="submitTier1" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nama Barang/Jasa *
              </label>
              <input 
                v-model="tier1Form.item_name"
                type="text"
                required
                maxlength="200"
                class="input-field"
                placeholder="Contoh: ATK untuk kegiatan workshop"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Deskripsi
              </label>
              <textarea 
                v-model="tier1Form.description"
                rows="3"
                class="input-field"
                placeholder="Deskripsi singkat kebutuhan"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Perkiraan Nilai *
              </label>
              <input 
                v-model.number="tier1Form.estimated_value"
                type="number"
                required
                min="1"
                max="10000000"
                class="input-field"
                placeholder="5000000"
              />
              <p v-if="tier1Form.estimated_value > 10000000" 
                 class="text-red-500 text-sm mt-1">
                ⚠️ Nilai melebihi Rp 10 juta. Gunakan Tier 2.
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Kode Anggaran *
              </label>
              <input 
                v-model="tier1Form.budget_code"
                type="text"
                required
                class="input-field"
                placeholder="5211"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Unit
              </label>
              <select v-model="tier1Form.unit" required class="input-field">
                <option value="">Pilih Unit</option>
                <option value="TU">Tata Usaha</option>
                <option value="Akademik">Akademik</option>
                <option value="Lab">Laboratorium</option>
                <option value="Perpustakaan">Perpustakaan</option>
              </select>
            </div>

            <div class="flex space-x-4">
              <button 
                type="submit"
                :disabled="submitting || tier1Form.estimated_value > 10000000"
                class="btn-primary flex-1"
              >
                {{ submitting ? 'Processing...' : 'Submit Request' }}
              </button>
              <button 
                type="button"
                @click="resetTier1Form"
                class="btn-secondary"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Tier 2 View (placeholder) -->
      <div v-else-if="currentView === 'tier2'" class="space-y-6">
        <h2 class="text-3xl font-bold">Tier 2: Pengadaan Rp 10-50 Juta</h2>
        <div class="card">
          <p class="text-gray-500">Coming soon...</p>
        </div>
      </div>

      <!-- Tier 3 View -->
      <div v-else-if="currentView === 'tier3'">
        <Tier3Form
          @submit="handleTier3Submit"
          @save-draft="handleTier3SaveDraft"
          @cancel="currentView = 'dashboard'"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import Tier3Form from './components/Tier3Form.vue'

const appVersion = ref('1.0.0')
const currentView = ref('dashboard')
const loading = ref(false)
const submitting = ref(false)
const requests = ref([])

const tier1Form = ref({
  item_name: '',
  description: '',
  estimated_value: 0,
  budget_code: '',
  unit: '',
  tier: 'tier1',
  requester_id: 'admin-id', // TODO: Get from auth
  status: 'draft'
})

// Computed
const stats = computed(() => {
  return {
    total: requests.value.length,
    pending: requests.value.filter(r => r.status === 'pending').length,
    completed: requests.value.filter(r => r.status === 'completed').length
  }
})

// Methods
async function loadRequests() {
  loading.value = true
  try {
    const result = await window.electronAPI.db.getRequests({})
    if (result.success) {
      requests.value = result.data
    }
  } catch (error) {
    console.error('Failed to load requests:', error)
  } finally {
    loading.value = false
  }
}

async function submitTier1() {
  submitting.value = true
  try {
    const result = await window.electronAPI.db.createRequest(tier1Form.value)
    
    if (result.success) {
      alert(`Request created successfully!\nRequest #: ${result.data.request_number}`)
      resetTier1Form()
      await loadRequests()
      currentView.value = 'dashboard'
    } else {
      alert('Error: ' + result.error)
    }
  } catch (error) {
    alert('Error: ' + error.message)
  } finally {
    submitting.value = false
  }
}

function resetTier1Form() {
  tier1Form.value = {
    item_name: '',
    description: '',
    estimated_value: 0,
    budget_code: '',
    unit: '',
    tier: 'tier1',
    requester_id: 'admin-id',
    status: 'draft'
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value)
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getStatusClass(status) {
  const classes = {
    draft: 'px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800',
    pending: 'px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800',
    approved: 'px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800',
    rejected: 'px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800',
    completed: 'px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800'
  }
  return classes[status] || classes.draft
}

// Tier 3 handlers
async function handleTier3Submit(formData) {
  try {
    const result = await window.electronAPI.request.create({
      ...formData,
      tier: 'tier3',
      status: 'pending'
    })

    if (result.success) {
      alert(`Pengajuan Tier 3 berhasil dibuat!\nNomor: ${result.data.request_number}`)
      await loadRequests()
      currentView.value = 'dashboard'
    } else {
      alert('Error: ' + (result.error?.message || result.error))
    }
  } catch (error) {
    console.error('Tier 3 submit error:', error)
    alert('Gagal menyimpan pengajuan: ' + error.message)
  }
}

async function handleTier3SaveDraft(formData) {
  try {
    const result = await window.electronAPI.request.create({
      ...formData,
      tier: 'tier3',
      status: 'draft'
    })

    if (result.success) {
      alert('Draft tersimpan!')
    } else {
      alert('Error: ' + (result.error?.message || result.error))
    }
  } catch (error) {
    console.error('Tier 3 save draft error:', error)
    alert('Gagal menyimpan draft: ' + error.message)
  }
}

// Lifecycle
onMounted(async () => {
  console.log('App mounted')
  
  // Get app version
  try {
    appVersion.value = await window.electronAPI.app.getVersion()
  } catch (error) {
    console.error('Failed to get version:', error)
  }

  // Load requests
  await loadRequests()
})
</script>
