import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('@/views/SignupView.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/oauth2/callback',
    name: 'OAuth2Callback',
    component: () => import('@/views/OAuth2CallbackView.vue'),
  },
  {
    path: '/products',
    name: 'ProductList',
    component: () => import('@/views/ProductListView.vue'),
  },
  {
    path: '/products/:productId',
    name: 'ProductDetail',
    component: () => import('@/views/ProductDetailView.vue'),
  },
  {
    path: '/mypage',
    name: 'Mypage',
    component: () => import('@/views/MypageView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/seller/products',
    name: 'SellerProductList',
    component: () => import('@/views/seller/ProductListView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/seller/products/new',
    name: 'ProductForm',
    component: () => import('@/views/seller/ProductFormView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/seller/products/:productId/edit',
    name: 'ProductEdit',
    component: () => import('@/views/seller/ProductEditView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/seller/settlements',
    name: 'SellerSettlementList',
    component: () => import('@/views/seller/SettlementListView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/seller/settlements/:settlementId',
    name: 'SellerSettlementDetail',
    component: () => import('@/views/seller/SettlementDetailView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/payment/checkout',
    name: 'PaymentCheckout',
    component: () => import('@/views/payment/CheckoutView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/payment/success',
    name: 'PaymentSuccess',
    component: () => import('@/views/payment/SuccessView.vue'),
  },
  {
    path: '/payment/fail',
    name: 'PaymentFail',
    component: () => import('@/views/payment/FailView.vue'),
  },
  {
    path: '/deposit/charge',
    name: 'DepositCharge',
    component: () => import('@/views/deposit/ChargeView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/deposit/success',
    name: 'DepositSuccess',
    component: () => import('@/views/deposit/SuccessView.vue'),
  },
  {
    path: '/deposit/fail',
    name: 'DepositFail',
    component: () => import('@/views/deposit/FailView.vue'),
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('@/views/admin/AdminDashboardView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    alert('관리자 권한이 필요합니다.')
    return { name: 'ProductList' }
  }
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { name: 'ProductList' }
  }
})

export default router
