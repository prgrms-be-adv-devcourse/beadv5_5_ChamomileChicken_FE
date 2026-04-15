<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { authApi } from '@/api/auth'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()
const auth = useAuthStore()

const products = ref([])
const loading = ref(true)

onMounted(async () => {
  if (auth.isLoggedIn && !auth.user) {
    await auth.fetchUser()
  }
  try {
    const res = await productsApi.list({ thisPage: 0, pageSize: 20, status: 'ENABLE' })
    const d = res.data?.data
    products.value = Array.isArray(d) ? d : (d?.items ?? d?.content ?? [])
  } catch {
    products.value = []
  } finally {
    loading.value = false
  }
})

async function logout() {
  try { await authApi.logout() } catch { /* ignore */ }
  auth.clearToken()
  router.push('/login')
}

function formatPrice(price) {
  return Number(price).toLocaleString('ko-KR')
}
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <header class="flex justify-between items-center mb-10 pb-4 border-b border-gray-200 dark:border-gray-800">
        <RouterLink to="/products" class="text-2xl font-bold tracking-tight">Jaba 클래스</RouterLink>
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <template v-if="auth.isLoggedIn">
            <RouterLink v-if="auth.isSeller" to="/seller/products"
              class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              상품 관리
            </RouterLink>
            <RouterLink to="/mypage"
              class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              마이페이지
            </RouterLink>
            <button @click="logout"
              class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              로그아웃
            </button>
          </template>
          <template v-else>
            <RouterLink to="/login"
              class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              로그인
            </RouterLink>
          </template>
        </div>
      </header>

      <div v-if="loading" class="text-center text-gray-400 dark:text-gray-500 py-20">
        <p>불러오는 중...</p>
      </div>

      <div v-else-if="products.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="product in products" :key="product.id"
          class="bg-white dark:bg-[#1e1e1e] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col group cursor-pointer">

          <div class="relative h-56 bg-gray-200 dark:bg-gray-700 w-full overflow-hidden">
            <img v-if="product.thumbnailPath" :src="product.thumbnailPath" alt="상품 이미지"
              class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
              <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="absolute top-3 left-3 bg-black bg-opacity-60 text-xs font-bold px-2 py-1 rounded-md text-gray-200">
              OPEN
            </div>
          </div>

          <div class="p-5 flex-grow flex flex-col">
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{{ product.sellerName }}</p>
            <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 line-clamp-2">{{ product.title }}</h3>
            <div class="flex items-end gap-2 mb-4">
              <span class="text-xl font-bold">₩{{ formatPrice(product.price) }}</span>
            </div>
            <div class="flex gap-2 mt-auto">
              <RouterLink :to="`/products/${product.id}`"
                class="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition">
                상세 보기
              </RouterLink>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center text-gray-400 dark:text-gray-500 py-20">
        <p>등록된 상품이 없습니다.</p>
      </div>

    </div>
  </div>
</template>
