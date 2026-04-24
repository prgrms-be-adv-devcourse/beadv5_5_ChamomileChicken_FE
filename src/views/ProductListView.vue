<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { authApi } from '@/api/auth'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { resolveImageUrl } from '@/utils/imageUrl'
import { extractApiData } from '@/utils/api'

const router = useRouter()
const auth = useAuthStore()

const products = ref([])
const recommendedProducts = ref([])
const loading = ref(true)
const errorMessage = ref('')
const recommendationError = ref('')
const recommendationLoading = ref(false)
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

function normalizeRecommendationPayload(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.recommendations)) return payload.recommendations
  if (Array.isArray(payload?.data?.recommendations)) return payload.data.recommendations
  return []
}

function getRecommendationProductId(item) {
  return item?.productId ?? item?.productid ?? item?.product_id ?? item?.id ?? null
}

async function fetchRecommendations() {
  if (!auth.isLoggedIn) {
    recommendedProducts.value = []
    recommendationError.value = ''
    return
  }

  recommendationLoading.value = true
  recommendationError.value = ''

  try {
    const res = await productsApi.recommendations()
    const recommendationItems = normalizeRecommendationPayload(extractApiData(res))

    if (!recommendationItems.length) {
      recommendedProducts.value = []
      return
    }

    const recommendationIds = recommendationItems.map(getRecommendationProductId)
    const detailResults = await Promise.allSettled(
      recommendationIds.map((id) => id ? productsApi.detail(id) : Promise.resolve(null))
    )

    recommendedProducts.value = recommendationItems.map((item, index) => {
      const detailResult = detailResults[index]
      const detailData = detailResult?.status === 'fulfilled'
        ? extractApiData(detailResult.value)
        : null
      const id = recommendationIds[index]

      return {
        id,
        title: detailData?.title ?? item.title,
        reason: item.reason,
        price: detailData?.price ?? null,
        sellerName: detailData?.sellerName ?? '',
        thumbnailPath: detailData?.thumbnailPath ?? '',
      }
    })
  } catch (e) {
    recommendedProducts.value = []
    const status = e.response?.status
    if ([401, 403, 404, 500].includes(status)) {
      recommendationError.value = ''
      console.warn('[recommendations] fallback to empty state', {
        status,
        message: e.response?.data?.message || e.message,
      })
      return
    }
    recommendationError.value = e.response?.data?.message || '추천 클래스를 불러오지 못했습니다.'
  } finally {
    recommendationLoading.value = false
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.user) {
    await auth.fetchUser()
  }
  await Promise.all([fetchProducts(), fetchRecommendations()])
  startBannerAuto()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  clearInterval(bannerTimer)
  window.removeEventListener('scroll', onScroll)
})

function handleSearch() {
  currentPage.value = 0
  fetchProducts()
}

let searchDebounceTimer = null
function onSearchInput(e) {
  searchQuery.value = e.target.value
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    currentPage.value = 0
    fetchProducts()
  }, 300)
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

const scrolled = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 300
}

const banners = [
  { src: '/winter-banner.png', alt: '겨울 특별 클래스' },
  { src: '/ilon-banner.png', alt: '추천 클래스' },
  { src: '/newjeans-banner.png', alt: 'New Jeans 클래스' },
  { src: '/son-potato-banner.png', alt: '손호준의 감자 클래스' },
]
const bannerIndex = ref(0)
let bannerTimer = null

function startBannerAuto() {
  bannerTimer = setInterval(() => {
    bannerIndex.value = (bannerIndex.value + 1) % banners.length
  }, 5000)
}

function prevBanner() {
  bannerIndex.value = (bannerIndex.value - 1 + banners.length) % banners.length
  restartBannerAuto()
}

function nextBanner() {
  bannerIndex.value = (bannerIndex.value + 1) % banners.length
  restartBannerAuto()
}

function restartBannerAuto() {
  clearInterval(bannerTimer)
  startBannerAuto()
}

function onBannerBeforeEnter(el) {
  el.style.height = '0'
  el.style.overflow = 'hidden'
  el.style.opacity = '0'
}
function onBannerEnter(el, done) {
  const h = el.scrollHeight
  el.style.transition = 'height 0.4s ease, opacity 0.4s ease'
  el.style.height = h + 'px'
  el.style.opacity = '1'
  el.addEventListener('transitionend', done, { once: true })
}
function onBannerAfterEnter(el) {
  el.style.height = ''
  el.style.overflow = ''
  el.style.opacity = ''
  el.style.transition = ''
}
function onBannerBeforeLeave(el) {
  el.style.height = el.scrollHeight + 'px'
  el.style.overflow = 'hidden'
}
function onBannerLeave(el, done) {
  el.style.transition = 'height 0.4s ease, opacity 0.4s ease'
  el.style.height = '0'
  el.style.opacity = '0'
  el.addEventListener('transitionend', done, { once: true })
}
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
        <RouterLink to="/faq" class="btn btn-ghost btn-sm rounded-full font-bold hidden sm:flex">자주 묻는 질문</RouterLink>
        <template v-if="auth.isLoggedIn">
          <div class="hidden lg:flex gap-2">
            <RouterLink v-if="auth.isAdmin" to="/admin" class="btn btn-ghost btn-sm rounded-full">관리자</RouterLink>
            <RouterLink v-if="auth.isSeller || auth.isAdmin" to="/seller/products" class="btn btn-ghost btn-sm rounded-full">상품 관리</RouterLink>
            <RouterLink v-if="auth.isSeller" to="/seller/settlements" class="btn btn-ghost btn-sm rounded-full">정산</RouterLink>
          </div>
          <div class="dropdown dropdown-end">
            <label tabindex="0" class="btn btn-ghost btn-circle avatar online">
              <div class="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm" style="display:flex;align-items:center;justify-content:center;line-height:1">
                {{ auth.user?.name?.charAt(0) || 'U' }}
              </div>
            </label>
            <ul tabindex="0" class="mt-3 z-[1] p-2 shadow-xl menu menu-sm dropdown-content bg-base-100 rounded-2xl w-52 border border-base-300/50">
              <li><RouterLink to="/mypage" class="py-3">마이페이지</RouterLink></li>
              <li><button @click="logout" class="py-3 text-error">로그아웃</button></li>
            </ul>
          </div>
        </template>
        <template v-else>
          <RouterLink to="/login" class="btn btn-primary btn-sm rounded-full px-6">로그인</RouterLink>
        </template>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 py-8">
      <!-- Welcome Header -->
      <div class="mb-10 text-center lg:text-left">
        <h1 class="text-3xl lg:text-4xl font-extrabold tracking-tight text-base-content mb-2">
          {{ auth.isLoggedIn && auth.user?.name ? `${auth.user.name} 님 반가워요! 👋` : '반가워요! 👋' }}
        </h1>
        <p class="text-base-content/60 text-lg">두근 두근! 오늘은 어떤 클래스를 찾아볼까요?</p>
      </div>

      <!-- Search Bar -->
      <div class="mb-12">
        <form @submit.prevent="handleSearch" class="relative group">
          <input
            :value="searchQuery"
            @input="onSearchInput"
            type="text"
            placeholder="어떤 클래스를 찾으시나요? (예: 요가, 베이킹)"
            class="input w-full h-16 pl-14 pr-32 rounded-3xl bg-base-100 border-none shadow-sm focus:shadow-md focus:ring-2 focus:ring-primary/20 transition-all text-lg"
          />
          <svg class="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-base-content/30 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <button type="submit" class="btn btn-primary absolute right-2 top-2 bottom-2 rounded-2xl px-8 shadow-lg shadow-primary/20">
            검색
          </button>
        </form>
      </div>

      <!-- Banner Carousel (검색 중엔 슬라이드 업) -->
      <transition
        @before-enter="onBannerBeforeEnter"
        @enter="onBannerEnter"
        @after-enter="onBannerAfterEnter"
        @before-leave="onBannerBeforeLeave"
        @leave="onBannerLeave"
      >
        <div v-if="!searchQuery && !scrolled">
          <div class="mb-4">
            <h2 class="text-xl font-black text-base-content">🔥 잡아 클래스 소식</h2>
          </div>
          <div class="relative mb-12 rounded-[28px] overflow-hidden shadow-md select-none">
            <transition name="banner-fade" mode="out-in">
              <img
                :key="bannerIndex"
                :src="banners[bannerIndex].src"
                :alt="banners[bannerIndex].alt"
                class="w-full object-cover aspect-[16/9]"
              />
            </transition>

            <!-- 좌 화살표 -->
            <button
              @click="prevBanner"
              class="absolute left-3 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-base-100/70 hover:bg-base-100 border-none shadow backdrop-blur-sm"
              aria-label="이전 배너"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <!-- 우 화살표 -->
            <button
              @click="nextBanner"
              class="absolute right-3 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-base-100/70 hover:bg-base-100 border-none shadow backdrop-blur-sm"
              aria-label="다음 배너"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <!-- 인디케이터 -->
            <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
              <button
                v-for="(_, i) in banners"
                :key="i"
                @click="bannerIndex = i; restartBannerAuto()"
                :class="['w-2 h-2 rounded-full transition-all', i === bannerIndex ? 'bg-white w-5' : 'bg-white/50']"
              />
            </div>
          </div>

          <hr class="border-base-300 mb-12" />
        </div>
      </transition>

      <!-- Error -->
      <div v-if="errorMessage" role="alert" class="alert bg-error/10 border-none text-error mb-8 rounded-2xl animate-in fade-in slide-in-from-top-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span class="font-semibold">{{ errorMessage }}</span>
      </div>

      <div v-if="!searchQuery && auth.isLoggedIn" class="mb-12">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-xl font-black text-base-content">맞춤 추천 클래스</h2>
            <p class="text-sm text-base-content/50 font-medium">최근 활동을 바탕으로 골라봤어요.</p>
          </div>
          <span v-if="recommendedProducts.length" class="badge badge-primary badge-lg border-none">{{ recommendedProducts.length }}개</span>
        </div>

        <div v-if="recommendationLoading" class="card bg-base-100 border border-base-300/30 rounded-[28px] shadow-sm">
          <div class="card-body py-10 items-center text-center">
            <span class="loading loading-spinner loading-md text-primary"></span>
            <p class="text-base-content/40 font-medium">회원님을 위한 클래스를 고르는 중이에요...</p>
          </div>
        </div>

        <div v-else-if="recommendationError" class="alert bg-warning/10 border-none text-warning rounded-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span class="font-semibold">{{ recommendationError }}</span>
        </div>

        <div v-else-if="recommendedProducts.length" class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <component
            v-for="item in recommendedProducts"
            :key="item.id ?? `${item.title}-${item.reason}`"
            :is="item.id ? 'RouterLink' : 'div'"
            v-bind="item.id ? { to: `/products/${item.id}` } : {}"
            class="card bg-base-100 border border-base-300/30 rounded-[28px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden group"
          >
            <div class="flex h-full">
              <div class="w-28 sm:w-36 bg-base-200 overflow-hidden shrink-0">
                <img
                  v-if="item.thumbnailPath"
                  :src="resolveImageUrl(item.thumbnailPath)"
                  alt="추천 클래스 이미지"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div v-else class="w-full h-full min-h-[132px] flex items-center justify-center bg-primary/5 text-4xl opacity-60">✨</div>
              </div>
              <div class="flex-1 p-5 flex flex-col">
                <div class="flex items-center gap-2 mb-2">
                  <span class="badge bg-primary/10 text-primary border-none font-black">For You</span>
                  <span v-if="item.sellerName" class="text-xs text-base-content/40 font-bold">{{ item.sellerName }}</span>
                </div>
                <h3 class="text-lg font-extrabold text-base-content leading-tight mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {{ item.title }}
                </h3>
                <p class="text-sm text-base-content/60 font-medium leading-relaxed line-clamp-3 mb-4">
                  {{ item.reason }}
                </p>
                <div class="mt-auto flex items-end justify-between">
                  <p v-if="item.price !== null" class="text-xl font-black text-base-content">
                    <span class="text-sm font-bold mr-0.5">₩</span>{{ formatPrice(item.price) }}
                  </p>
                  <p v-else class="text-sm text-base-content/30 font-bold">
                    {{ item.id ? '상세 페이지에서 금액 확인' : '추천 사유 기반 결과' }}
                  </p>
                  <div class="w-10 h-10 rounded-2xl bg-base-200 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </component>
        </div>

        <div v-else class="card bg-base-100 border border-dashed border-base-300 rounded-[28px] shadow-sm">
          <div class="card-body py-10 items-center text-center">
            <div class="w-16 h-16 rounded-3xl bg-primary/10 text-3xl flex items-center justify-center mb-3">🎯</div>
            <p class="font-bold text-base-content/70">아직 추천 결과가 없어요.</p>
            <p class="text-sm text-base-content/40">찜하거나 둘러보면 더 잘 맞는 클래스를 보여드릴게요.</p>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col justify-center items-center py-32 gap-4">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="text-base-content/40 font-medium">좋은 클래스를 찾고 있어요...</p>
      </div>

      <div v-else-if="!errorMessage && products.length > 0">
        <div class="flex items-center justify-between mb-8">
          <p class="text-lg font-bold text-base-content">
            <span v-if="searchQuery">"{{ searchQuery }}" 결과</span>
            <span v-else>인기 클래스 🔥</span>
            <span class="ml-2 text-base-content/30 font-medium text-sm">{{ totalCount }}개</span>
          </p>
        </div>

        <!-- Product Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <RouterLink v-for="product in products" :key="product.id" 
            :to="`/products/${product.id}`" 
            class="card bg-base-100 hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 overflow-hidden border border-base-300/30 group">
            <figure class="aspect-[4/3] bg-base-200 relative overflow-hidden">
              <img v-if="product.thumbnailPath" :src="resolveImageUrl(product.thumbnailPath)" alt="상품 이미지" 
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div v-else class="w-full h-full flex items-center justify-center bg-primary/5">
                <span class="text-5xl opacity-20">🎨</span>
              </div>
              <div class="absolute top-4 left-4">
                <span class="badge bg-white/90 backdrop-blur border-none text-primary font-black shadow-sm py-3 px-4 rounded-xl">OPEN</span>
              </div>
            </figure>
            <div class="card-body p-6">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-6 h-6 rounded-full bg-base-200 flex items-center justify-center text-[10px]">🏢</div>
                <p class="text-xs text-base-content/50 font-bold uppercase tracking-wider">{{ product.sellerName }}</p>
              </div>
              <h2 class="card-title text-lg font-extrabold line-clamp-2 leading-tight mb-2 group-hover:text-primary transition-colors">
                {{ product.title }}
              </h2>
              <div class="mt-auto flex items-end justify-between">
                <div>
                  <p class="text-2xl font-black text-base-content tracking-tight">
                    <span class="text-sm font-bold mr-0.5">₩</span>{{ formatPrice(product.price) }}
                  </p>
                </div>
                <div class="w-10 h-10 rounded-2xl bg-base-200 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </div>
          </RouterLink>
        </div>

        <!-- Pagination -->
        <div v-if="totalPage > 1" class="flex justify-center mb-20">
          <div class="join bg-base-100 p-1 rounded-2xl shadow-sm border border-base-300/50">
            <button
              @click="handlePageChange(currentPage - 1)"
              :disabled="currentPage === 0"
              class="join-item btn btn-ghost btn-md rounded-xl disabled:bg-transparent"
            >이전</button>
            <button
              v-for="p in totalPage"
              :key="p"
              @click="handlePageChange(p - 1)"
              class="join-item btn btn-md rounded-xl px-5"
              :class="currentPage === p - 1 ? 'btn-primary shadow-lg shadow-primary/20' : 'btn-ghost'"
            >{{ p }}</button>
            <button
              @click="handlePageChange(currentPage + 1)"
              :disabled="currentPage === totalPage - 1"
              class="join-item btn btn-ghost btn-md rounded-xl disabled:bg-transparent"
            >다음</button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!errorMessage && !loading" class="flex flex-col items-center justify-center py-32 text-center">
        <div class="w-24 h-24 bg-base-100 rounded-3xl flex items-center justify-center text-5xl shadow-sm mb-6 animate-bounce">
          🔎
        </div>
        <h3 class="text-xl font-bold text-base-content mb-2">원하시는 클래스를 찾을 수 없어요</h3>
        <p v-if="searchQuery" class="text-base-content/40 font-medium">
          다른 키워드로 검색해보시겠어요?
        </p>
        <p v-else class="text-base-content/40 font-medium">등록된 클래스가 아직 없어요.</p>
        <button @click="searchQuery = ''; fetchProducts()" class="btn btn-primary btn-outline mt-8 rounded-2xl px-10 border-2">
          전체 보기
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.banner-fade-enter-active,
.banner-fade-leave-active {
  transition: opacity 0.5s ease;
}
.banner-fade-enter-from,
.banner-fade-leave-to {
  opacity: 0;
}
</style>
