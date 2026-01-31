/**
 * Vue Router Configuration
 * Routes for PPK Asisten application
 */

import { createRouter, createWebHashHistory } from 'vue-router';

// Lazy load components
const Dashboard = () => import('../views/Dashboard.vue');
const RequestList = () => import('../views/RequestList.vue');
const RequestDetail = () => import('../views/RequestDetail.vue');
const RequestCreate = () => import('../views/RequestCreate.vue');
const VendorList = () => import('../views/VendorList.vue');
const VendorDetail = () => import('../views/VendorDetail.vue');
const ContractList = () => import('../views/ContractList.vue');
const ContractDetail = () => import('../views/ContractDetail.vue');
const PaymentList = () => import('../views/PaymentList.vue');
const Reports = () => import('../views/Reports.vue');
const Settings = () => import('../views/Settings.vue');
const Login = () => import('../views/Login.vue');

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { title: 'Dashboard', icon: 'home', requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { title: 'Login', guest: true }
  },

  // Request routes
  {
    path: '/requests',
    name: 'RequestList',
    component: RequestList,
    meta: { title: 'Daftar Permintaan', icon: 'document', requiresAuth: true }
  },
  {
    path: '/requests/create',
    name: 'RequestCreate',
    component: RequestCreate,
    meta: { title: 'Buat Permintaan', requiresAuth: true }
  },
  {
    path: '/requests/create/:tier',
    name: 'RequestCreateTier',
    component: RequestCreate,
    props: true,
    meta: { title: 'Buat Permintaan', requiresAuth: true }
  },
  {
    path: '/requests/:id',
    name: 'RequestDetail',
    component: RequestDetail,
    props: true,
    meta: { title: 'Detail Permintaan', requiresAuth: true }
  },

  // Vendor routes
  {
    path: '/vendors',
    name: 'VendorList',
    component: VendorList,
    meta: { title: 'Daftar Vendor', icon: 'users', requiresAuth: true }
  },
  {
    path: '/vendors/:id',
    name: 'VendorDetail',
    component: VendorDetail,
    props: true,
    meta: { title: 'Detail Vendor', requiresAuth: true }
  },

  // Contract routes
  {
    path: '/contracts',
    name: 'ContractList',
    component: ContractList,
    meta: { title: 'Daftar Kontrak', icon: 'file-text', requiresAuth: true }
  },
  {
    path: '/contracts/:id',
    name: 'ContractDetail',
    component: ContractDetail,
    props: true,
    meta: { title: 'Detail Kontrak', requiresAuth: true }
  },

  // Payment routes
  {
    path: '/payments',
    name: 'PaymentList',
    component: PaymentList,
    meta: { title: 'Daftar Pembayaran', icon: 'credit-card', requiresAuth: true }
  },

  // Reports
  {
    path: '/reports',
    name: 'Reports',
    component: Reports,
    meta: { title: 'Laporan', icon: 'chart', requiresAuth: true }
  },

  // Settings
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { title: 'Pengaturan', icon: 'settings', requiresAuth: true }
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

  // Check authentication (implement actual auth check)
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
