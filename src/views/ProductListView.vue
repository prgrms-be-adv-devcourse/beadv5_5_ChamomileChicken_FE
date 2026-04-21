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
const errorMessage = ref('')
const searchQuery = ref('')
const currentPage = ref(0)
const pageSize = ref(9)
const totalPage = ref(0)
const totalCount = ref(0)

async function fetchProducts() {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = {
      thisPage: currentPage.value,
      pageSize: pageSize.value,
    }
    if (searchQuery.value.trim()) {
      params.title = searchQuery.value.trim()
    }
    const res = await productsApi.list(params)
    const d = res.data?.data
    products.value = d?.content ?? []
    totalPage.value = d?.totalPage ?? 0
    totalCount.value = d?.totalCount ?? 0
  } catch (e) {
    products.value = []
    totalPage.value = 0
    totalCount.value = 0
    if (!e.response) {
      errorMessage.value = 'Elasticsearch 서버에 연결할 수 없습니다. 서버 상태를 확인해주세요.'
    } else {
      errorMessage.value = e.response?.data?.message || '상품을 불러오는 데 실패했습니다.'
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.user) {
    await auth.fetchUser()
  }
  await fetchProducts()
})

function handleSearch() {
  currentPage.value = 0
  fetchProducts()
}

function handlePageChange(page) {
  currentPage.value = page
  fetchProducts()
}

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
            <RouterLink v-if="auth.isAdmin" to="/admin"
              class="bg-gray-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
              관리자 페이지
            </RouterLink>
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

      <!-- Search Bar -->
      <div class="mb-8">
        <form @submit.prevent="handleSearch" class="flex gap-2 max-w-md mx-auto">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="상품명, 상품 설명으로 검색"
            class="flex-grow px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1e1e1e] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            class="px-6 py-2 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-xl hover:bg-gray-700 dark:hover:bg-gray-200 transition"
          >
            검색
          </button>
        </form>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm text-center">
        {{ errorMessage }}
      </div>

      <div v-if="loading" class="text-center text-gray-400 dark:text-gray-500 py-20">
        <p>불러오는 중...</p>
      </div>

      <div v-else-if="!errorMessage && products.length > 0">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          전체 <span class="font-semibold text-gray-800 dark:text-gray-200">{{ totalCount }}</span>개 상품
          <span v-if="searchQuery"> · "<span class="font-semibold">{{ searchQuery }}</span>" 검색 결과</span>
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
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

        <!-- Pagination -->
        <div v-if="totalPage > 1" class="flex justify-center items-center gap-2 mb-10">
          <button
            @click="handlePageChange(currentPage - 1)"
            :disabled="currentPage === 0"
            class="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm font-medium"
          >
            이전
          </button>
          <div class="flex gap-1">
            <button
              v-for="p in totalPage"
              :key="p"
              @click="handlePageChange(p - 1)"
              class="w-10 h-10 rounded-lg border transition-colors text-sm font-medium"
              :class="currentPage === p - 1
                ? 'bg-gray-900 dark:bg-white text-white dark:text-black border-transparent shadow-sm'
                : 'border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'"
            >
              {{ p }}
            </button>
          </div>
          <button
            @click="handlePageChange(currentPage + 1)"
            :disabled="currentPage === totalPage - 1"
            class="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition text-sm font-medium"
          >
            다음
          </button>
        </div>
      </div>

      <div v-else-if="!errorMessage && !loading" class="text-center text-gray-400 dark:text-gray-500 py-20">
        <p v-if="searchQuery">
          '<span class="font-semibold text-gray-600 dark:text-gray-300">{{ searchQuery }}</span>' 검색 결과가 없습니다.
        </p>
        <p v-else>등록된 상품이 없습니다.</p>
      </div>

    </div>
  </div>
</template>
