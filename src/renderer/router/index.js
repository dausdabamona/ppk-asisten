import { createRouter, createWebHashHistory } from 'vue-router'

// Views
import STListView from '../views/STListView.vue'
import STFormView from '../views/STFormView.vue'
import STDetailView from '../views/STDetailView.vue'
import STPertanggungjawabanView from '../views/STPertanggungjawabanView.vue'

const routes = [
  {
    path: '/',
    redirect: '/transaksi/st'
  },
  {
    path: '/transaksi',
    name: 'Transaksi',
    children: [
      {
        path: 'st',
        name: 'STList',
        component: STListView,
        meta: { title: 'Surat Tugas' }
      },
      {
        path: 'st/tambah',
        name: 'STCreate',
        component: STFormView,
        meta: { title: 'Tambah Surat Tugas' }
      },
      {
        path: 'st/:id',
        name: 'STDetail',
        component: STDetailView,
        meta: { title: 'Detail Surat Tugas' }
      },
      {
        path: 'st/:id/edit',
        name: 'STEdit',
        component: STFormView,
        meta: { title: 'Edit Surat Tugas' }
      },
      {
        path: 'st/:id/pelaksana',
        name: 'STPelaksana',
        component: STDetailView, // TODO: Create dedicated view
        meta: { title: 'Kelola Pelaksana' }
      },
      {
        path: 'st/:id/biaya',
        name: 'STBiaya',
        component: STDetailView, // TODO: Create dedicated view
        meta: { title: 'Rincian Biaya' }
      },
      {
        path: 'st/:id/pertanggungjawaban',
        name: 'STPertanggungjawaban',
        component: STPertanggungjawabanView,
        meta: { title: 'Pertanggungjawaban' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// Global navigation guard
router.beforeEach((to, from, next) => {
  // Update document title
  document.title = (to.meta.title || 'PPK Assistant') + ' - PPK ASISTEN'
  next()
})

export default router
