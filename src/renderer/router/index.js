/**
 * Vue Router Configuration
 * Routes for PPK Asisten application
 */

import { createRouter, createWebHashHistory } from 'vue-router';

// Lazy load components
const MainLayout = () => import('../layouts/MainLayout.vue');
const Dashboard = () => import('../views/Dashboard.vue');
const Login = () => import('../views/Login.vue');

// Master Data
const SatkerView = () => import('../views/master/SatkerView.vue');
const PegawaiListView = () => import('../views/master/PegawaiListView.vue');
const PegawaiFormView = () => import('../views/master/PegawaiFormView.vue');
const SupplierListView = () => import('../views/master/SupplierListView.vue');
const SupplierFormView = () => import('../views/master/SupplierFormView.vue');
const DipaListView = () => import('../views/master/DipaListView.vue');
const DipaDetailView = () => import('../views/master/DipaDetailView.vue');
const DipaUploadView = () => import('../views/master/DipaUploadView.vue');
const DipaItemBrowseView = () => import('../views/master/DipaItemBrowseView.vue');
const SbmListView = () => import('../views/master/SbmListView.vue');
const SbmDetailView = () => import('../views/master/SbmDetailView.vue');

// Transaction
const RequestList = () => import('../views/RequestList.vue');
const RequestDetail = () => import('../views/RequestDetail.vue');
const RequestCreate = () => import('../views/RequestCreate.vue');
const ContractList = () => import('../views/ContractList.vue');
const ContractDetail = () => import('../views/ContractDetail.vue');
const PaymentList = () => import('../views/PaymentList.vue');

// Reports & Settings
const Reports = () => import('../views/Reports.vue');
const Settings = () => import('../views/Settings.vue');

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: 'Login', guest: true }
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: Dashboard,
        meta: { title: 'Dashboard', icon: 'home' }
      },

      // Master Data Routes
      {
        path: 'master/satker',
        name: 'MasterSatker',
        component: SatkerView,
        meta: { title: 'Master Satker', icon: 'building', parent: 'Master Data' }
      },
      {
        path: 'master/pegawai',
        name: 'MasterPegawai',
        component: PegawaiListView,
        meta: { title: 'Master Pegawai', icon: 'users', parent: 'Master Data' }
      },
      {
        path: 'master/pegawai/tambah',
        name: 'PegawaiTambah',
        component: PegawaiFormView,
        meta: { title: 'Tambah Pegawai', parent: 'Master Data' }
      },
      {
        path: 'master/pegawai/:id',
        name: 'PegawaiEdit',
        component: PegawaiFormView,
        props: true,
        meta: { title: 'Edit Pegawai', parent: 'Master Data' }
      },
      {
        path: 'master/supplier',
        name: 'MasterSupplier',
        component: SupplierListView,
        meta: { title: 'Master Supplier', icon: 'truck', parent: 'Master Data' }
      },
      {
        path: 'master/supplier/tambah',
        name: 'SupplierTambah',
        component: SupplierFormView,
        meta: { title: 'Tambah Supplier', parent: 'Master Data' }
      },
      {
        path: 'master/supplier/:id',
        name: 'SupplierEdit',
        component: SupplierFormView,
        props: true,
        meta: { title: 'Edit Supplier', parent: 'Master Data' }
      },
      {
        path: 'master/dipa',
        name: 'MasterDipa',
        component: DipaListView,
        meta: { title: 'Master DIPA', icon: 'file-text', parent: 'Master Data' }
      },
      {
        path: 'master/dipa/:id',
        name: 'DipaDetail',
        component: DipaDetailView,
        props: true,
        meta: { title: 'Detail DIPA', parent: 'Master Data' }
      },
      {
        path: 'master/dipa/:id/upload',
        name: 'DipaUpload',
        component: DipaUploadView,
        props: true,
        meta: { title: 'Upload Revisi DIPA', parent: 'Master Data' }
      },
      {
        path: 'master/dipa/:id/browse',
        name: 'DipaBrowse',
        component: DipaItemBrowseView,
        props: true,
        meta: { title: 'Browse Anggaran', parent: 'Master Data' }
      },
      {
        path: 'master/sbm',
        name: 'MasterSbm',
        component: SbmListView,
        meta: { title: 'Master SBM', icon: 'calculator', parent: 'Master Data' }
      },
      {
        path: 'master/sbm/:id',
        name: 'SbmDetail',
        component: SbmDetailView,
        props: true,
        meta: { title: 'Detail SBM', parent: 'Master Data' }
      },
      {
        path: 'master/sbm/:id/uang-harian',
        name: 'SbmUangHarian',
        component: SbmDetailView,
        props: route => ({ id: route.params.id, activeTab: 'uang-harian' }),
        meta: { title: 'SBM Uang Harian', parent: 'Master Data' }
      },
      {
        path: 'master/sbm/:id/honorarium',
        name: 'SbmHonorarium',
        component: SbmDetailView,
        props: route => ({ id: route.params.id, activeTab: 'honorarium' }),
        meta: { title: 'SBM Honorarium', parent: 'Master Data' }
      },

      // Transaction Routes
      {
        path: 'requests',
        name: 'RequestList',
        component: RequestList,
        meta: { title: 'Daftar Permintaan', icon: 'document', parent: 'Transaksi' }
      },
      {
        path: 'requests/create',
        name: 'RequestCreate',
        component: RequestCreate,
        meta: { title: 'Buat Permintaan', parent: 'Transaksi' }
      },
      {
        path: 'requests/create/:tier',
        name: 'RequestCreateTier',
        component: RequestCreate,
        props: true,
        meta: { title: 'Buat Permintaan', parent: 'Transaksi' }
      },
      {
        path: 'requests/:id',
        name: 'RequestDetail',
        component: RequestDetail,
        props: true,
        meta: { title: 'Detail Permintaan', parent: 'Transaksi' }
      },
      {
        path: 'contracts',
        name: 'ContractList',
        component: ContractList,
        meta: { title: 'Daftar Kontrak', icon: 'file-text', parent: 'Transaksi' }
      },
      {
        path: 'contracts/:id',
        name: 'ContractDetail',
        component: ContractDetail,
        props: true,
        meta: { title: 'Detail Kontrak', parent: 'Transaksi' }
      },
      {
        path: 'payments',
        name: 'PaymentList',
        component: PaymentList,
        meta: { title: 'Daftar Pembayaran', icon: 'credit-card', parent: 'Transaksi' }
      },

      // Reports
      {
        path: 'reports',
        name: 'Reports',
        component: Reports,
        meta: { title: 'Laporan', icon: 'chart' }
      },

      // Settings
      {
        path: 'settings',
        name: 'Settings',
        component: Settings,
        meta: { title: 'Pengaturan', icon: 'settings' }
      }
    ]
  },

  // Catch-all redirect
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

// Navigation guard
router.beforeEach((to, from, next) => {
  // Update document title
  document.title = to.meta.title ? `${to.meta.title} - PPK Asisten` : 'PPK Asisten';

  // Check authentication
  const isAuthenticated = localStorage.getItem('ppk_user') !== null;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
  } else if (to.meta.guest && isAuthenticated) {
    next({ name: 'Dashboard' });
  } else {
    next();
  }
});

export default router;
