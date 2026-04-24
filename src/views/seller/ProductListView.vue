<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { authApi } from '@/api/auth'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { resolveImageUrl } from '@/utils/imageUrl'

const router = useRouter()
const auth = useAuthStore()

const products = ref([])
const loading = ref(true)
const deletingId = ref(null)
const loadError = ref('')

onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
  if (!auth.isSeller && !auth.isAdmin) { router.push('/products'); return }
  await loadProducts()
})

async function loadProducts() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await productsApi.my({ thisPage: 0, pageSize: 100 })
    console.log('[seller products] response:', res.data)
    const d = res.data?.data
    products.value = Array.isArray(d) ? d : (d?.items ?? d?.content ?? [])
  } catch (e) {
    console.error('[seller products] error:', e.response ?? e)
    loadError.value = e.response?.data?.message || '상품 목록을 불러오지 못했습니다.'
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
  <div class="bg-base-200 min-h-screen pb-20">
    <!-- Navbar -->
    <div class="navbar bg-base-100/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-10 border-b border-base-300/50">
      <div class="flex-1">
        <RouterLink to="/products" class="hover:opacity-80 transition-opacity">
          <img src="/logo.svg" class="h-12 lg:h-14" alt="Jaba 클래스" />
        </RouterLink>
      </div>
      <div class="flex-none flex items-center gap-4">
        <ThemeToggle />
        <RouterLink to="/mypage" class="btn btn-ghost btn-sm rounded-full font-bold">마이페이지</RouterLink>
        <button @click="logout" class="btn btn-ghost btn-sm rounded-full font-bold text-error/70">로그아웃</button>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 py-10 lg:py-16">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 px-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 class="text-3xl lg:text-4xl font-black text-base-content tracking-tight mb-2">내 상품 관리</h1>
          <p class="text-base-content/40 font-bold">등록하신 클래스를 한눈에 확인하고 관리하세요.</p>
        </div>
        <div class="flex gap-3">
          <RouterLink to="/seller/settlements" class="btn bg-base-100 hover:bg-base-300 border-none rounded-2xl px-6 font-black transition-all">
            💰 정산 확인
          </RouterLink>
          <RouterLink to="/seller/products/new" class="btn btn-primary rounded-2xl px-8 font-black shadow-xl shadow-primary/20 border-none transition-all active:scale-95">
            ✨ 상품 등록
          </RouterLink>
        </div>
      </div>

      <div v-if="loadError" class="alert bg-error/10 border-none text-error py-4 rounded-2xl mb-6 font-black">{{ loadError }}</div>

      <div v-if="loading" class="flex flex-col justify-center items-center py-32 gap-4">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="text-base-content/40 font-medium">상품 목록을 가져오고 있어요...</p>
      </div>

      <div v-else-if="products.length === 0" class="card bg-base-100 rounded-[40px] shadow-sm border border-base-300/20 animate-in fade-in zoom-in duration-500">
        <div class="card-body items-center text-center py-24">
          <div class="w-24 h-24 bg-base-200 rounded-[32px] flex items-center justify-center text-5xl mb-6">🏝️</div>
          <h3 class="text-xl font-black mb-2">아직 등록된 상품이 없어요</h3>
          <p class="text-base-content/40 font-bold mb-10">첫 번째 클래스를 등록하고 수강생들을 만나보세요!</p>
          <RouterLink to="/seller/products/new" class="btn btn-primary btn-lg rounded-2xl px-12 font-black shadow-xl shadow-primary/20 border-none transition-all active:scale-95">
            첫 상품 등록하기
          </RouterLink>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div v-for="product in products" :key="product.id" 
          class="card bg-base-100 rounded-[32px] border border-base-300/20 hover:shadow-md transition-all group overflow-hidden">
          <div class="card-body p-6 lg:p-8 flex-row items-center gap-6">
            <div class="w-20 h-20 lg:w-24 lg:h-24 rounded-3xl overflow-hidden bg-base-200 shrink-0 relative">
              <img v-if="product.thumbnailPath" :src="resolveImageUrl(product.thumbnailPath)" alt="상품 이미지" 
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div v-else class="w-full h-full flex items-center justify-center text-4xl opacity-20">🎨</div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg lg:text-xl font-black truncate group-hover:text-primary transition-colors">{{ product.title }}</h3>
                <span :class="product.status === 'ENABLE' ? 'bg-success/10 text-success' : 'bg-base-200 text-base-content/30'" 
                  class="badge border-none font-black text-[10px] py-2.5 px-3 uppercase tracking-wider">
                  {{ product.status === 'ENABLE' ? '판매중' : '비활성' }}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-y-1 gap-x-4">
                <p class="text-lg font-black text-primary tracking-tight">₩{{ formatPrice(product.price) }}</p>
                <div class="flex items-center gap-1.5 text-xs font-bold text-base-content/30">
                  <span class="w-1 h-1 rounded-full bg-base-content/20"></span>
                  최대 정원 {{ product.maxCapacity }}명
                </div>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-2 shrink-0">
              <RouterLink :to="`/products/${product.id}`" class="btn btn-ghost bg-base-200 rounded-xl px-4 text-xs font-black">보기</RouterLink>
              <RouterLink :to="`/seller/products/${product.id}/edit`" class="btn btn-ghost bg-base-200 rounded-xl px-4 text-xs font-black">수정</RouterLink>
              <button @click="deleteProduct(product.id)" :disabled="deletingId === product.id" 
                class="btn btn-error btn-outline rounded-xl px-4 text-xs font-black hover:text-white transition-all">
                <span v-if="deletingId === product.id" class="loading loading-spinner loading-xs"></span>
                <span v-else>삭제</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
