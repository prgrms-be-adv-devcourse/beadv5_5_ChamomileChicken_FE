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
const deletingId = ref(null)

onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
  if (!auth.isSeller) { router.push('/products'); return }
  await loadProducts()
})

async function loadProducts() {
  loading.value = true
  try {
    const res = await productsApi.list({ sellerId: auth.user?.userId, thisPage: 0, pageSize: 100 })
    const d = res.data?.data
    products.value = Array.isArray(d) ? d : (d?.items ?? d?.content ?? [])
  } catch {
    products.value = []
  } finally {
    loading.value = false
  }
}

async function deleteProduct(productId) {
  if (!confirm('정말 이 상품을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.')) return
  deletingId.value = productId
  try {
    await productsApi.delete(productId)
    products.value = products.value.filter(p => p.id !== productId)
  } catch (e) {
    alert(e.response?.data?.message || '상품 삭제에 실패했습니다.')
  } finally {
    deletingId.value = null
  }
}

async function logout() {
  try { await authApi.logout() } catch { /* ignore */ }
  auth.clearToken()
  router.push('/login')
}

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <header class="flex justify-between items-center mb-10 pb-4 border-b border-gray-200 dark:border-gray-800">
        <RouterLink to="/products" class="text-2xl font-bold tracking-tight">Jaba 클래스</RouterLink>
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <RouterLink to="/mypage"
            class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            마이페이지
          </RouterLink>
          <button @click="logout"
            class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            로그아웃
          </button>
        </div>
      </header>

      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-bold">내 상품 관리</h1>
        <RouterLink to="/seller/products/new"
          class="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          상품 등록
        </RouterLink>
      </div>

      <div v-if="loading" class="text-center text-gray-400 dark:text-gray-500 py-20">
        불러오는 중...
      </div>

      <div v-else-if="products.length === 0"
        class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-16 text-center">
        <p class="text-gray-400 dark:text-gray-500 mb-4">등록한 상품이 없습니다.</p>
        <RouterLink to="/seller/products/new"
          class="inline-block px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
          첫 상품 등록하기
        </RouterLink>
      </div>

      <div v-else class="space-y-3">
        <div v-for="product in products" :key="product.id"
          class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex gap-4 items-center">

          <!-- 썸네일 -->
          <div class="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center">
            <img v-if="product.thumbnailPath" :src="product.thumbnailPath" alt="상품 이미지" class="w-full h-full object-cover" />
            <svg v-else class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <!-- 상품 정보 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-bold text-gray-800 dark:text-gray-100 truncate">{{ product.title }}</h3>
              <span :class="product.status === 'ENABLE'
                ? 'bg-green-50 dark:bg-green-900/40 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 border-gray-300 dark:border-gray-600'"
                class="shrink-0 text-xs border px-2 py-0.5 rounded-full">
                {{ product.status === 'ENABLE' ? '판매중' : '비활성' }}
              </span>
            </div>
            <p class="text-sm font-bold text-gray-700 dark:text-gray-300">₩{{ formatPrice(product.price) }}</p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">최대 {{ product.maxCapacity }}명</p>
          </div>

          <!-- 액션 버튼 -->
          <div class="flex gap-2 shrink-0">
            <RouterLink :to="`/products/${product.id}`"
              class="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              보기
            </RouterLink>
            <RouterLink :to="`/seller/products/${product.id}/edit`"
              class="px-3 py-2 border border-gray-900 dark:border-white text-gray-900 dark:text-white rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              수정
            </RouterLink>
            <button @click="deleteProduct(product.id)"
              :disabled="deletingId === product.id"
              class="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
              {{ deletingId === product.id ? '삭제 중...' : '삭제' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
