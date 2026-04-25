<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { authApi } from '@/api/auth'
import ThemeToggle from '@/components/ThemeToggle.vue'
import ProductCard from '@/components/ProductCard.vue'
import { resolveImageUrl } from '@/utils/imageUrl'
import { extractApiData } from '@/utils/api'
import { useRecentProducts } from '@/composables/useRecentProducts'
import { useRecentSearches } from '@/composables/useRecentSearches'

const recentProducts = useRecentProducts()
const recentSearches = useRecentSearches()
const recentProductList = ref([])
const recentSearchList = ref([])
const showSearchDropdown = ref(false)

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
const pageSize = ref(16)
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

    recommendedProducts.value = recommendationItems.map((item) => {
      const id = getRecommendationProductId(item)
      return {
        id,
        title: item?.title ?? '',
        reason: item.reason,
        price: item?.price ?? null,
        sellerName: item?.sellerName ?? '',
        thumbnailPath: item?.thumbnailPath ?? '',
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
  recentProductList.value = recentProducts.getAll()
  recentSearchList.value = recentSearches.getAll()
})

onUnmounted(() => {
  clearInterval(bannerTimer)
  window.removeEventListener('scroll', onScroll)
})

function handleSearch() {
  if (searchQuery.value.trim()) {
    recentSearches.add(searchQuery.value)
    recentSearchList.value = recentSearches.getAll()
  }
  showSearchDropdown.value = false
  currentPage.value = 0
  fetchProducts()
}

function selectRecentSearch(query) {
  searchQuery.value = query
  showSearchDropdown.value = false
  currentPage.value = 0
  fetchProducts()
}

function removeRecentSearch(query) {
  recentSearches.remove(query)
  recentSearchList.value = recentSearches.getAll()
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

const greetings = [
  { text: (name) => name ? `${name} 님 반가워요!` : '반가워요!', emoji: '👋' },
  { text: (name) => name ? `${name} 님 어서오세요!` : '어서오세요!', emoji: '🎉' },
  { text: (name) => name ? `${name} 님 오늘도 좋은 하루!` : '오늘도 좋은 하루!', emoji: '☀️' },
  { text: (name) => name ? `${name} 님 반갑습니다!` : '반갑습니다!', emoji: '😊' },
  { text: (name) => name ? `${name} 님 오셨군요!` : '오셨군요!', emoji: '🌟' },
  { text: (name) => name ? `${name} 님 무엇을 배워볼까요?` : '무엇을 배워볼까요?', emoji: '📚' },
  { text: (name) => name ? `${name} 님 잘 오셨어요!` : '잘 오셨어요!', emoji: '✨' },
]
const greeting = ref(greetings[Math.floor(Math.random() * greetings.length)])

const subtitles = [
  '두근 두근! 오늘은 어떤 클래스를 찾아볼까요?',
  '새로운 취미, 오늘 시작해보는 건 어떨까요?',
  '배움에는 끝이 없죠. 오늘의 클래스를 골라보세요!',
  '오늘 하루도 뭔가 배워봐요!',
  '어떤 클래스가 당신을 기다리고 있을까요?',
  '잡아클래스와 함께라면 뭐든 배울 수 있어요!',
  '오늘의 나를 업그레이드할 클래스를 찾아볼까요?',
]
const subtitle = ref(subtitles[Math.floor(Math.random() * subtitles.length)])

const scrolled = ref(false)
const instantCollapse = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 80
}

function scrollToRecommendations() {
  instantCollapse.value = true
  scrolled.value = true
  nextTick(() => {
    document.getElementById('recommendations')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    instantCollapse.value = false
  })
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
  if (instantCollapse.value) {
    el.style.height = '0'
    el.style.opacity = '0'
    done()
    return
  }
  el.style.transition = 'height 0.4s ease, opacity 0.4s ease'
  el.style.height = '0'
  el.style.opacity = '0'
  el.addEventListener('transitionend', done, { once: true })
}
</script>

<template>
  <div class="bg-base-100 min-h-screen pb-20">
    <!-- Navbar -->
    <div class="navbar sticky top-0 z-30 border-b border-base-300/40 bg-base-100 px-4 lg:px-10">
      <div class="flex-1">
        <RouterLink to="/products" class="hover:opacity-80 transition-opacity">
          <svg width="220" height="50" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg" class="h-12 lg:h-14 w-auto">
              <g transform="translate(10, 5)">
                <rect x="5" y="8" width="24" height="24" rx="8" fill="#E8F0FE" transform="rotate(-12 17 20)" />
                <rect x="12" y="12" width="24" height="24" rx="8" fill="#487BE5" transform="rotate(8 24 24)" />
                <path d="M 38 2 Q 40 8 46 10 Q 40 12 38 18 Q 36 12 30 10 Q 36 8 38 2 Z" fill="#FFC83D" />
              </g>
              <text x="65" y="34" font-family="'Pretendard', -apple-system, sans-serif" font-weight="800" font-size="26" fill="currentColor" letter-spacing="-0.5">Jaba</text>
              <text x="125" y="34" font-family="'Pretendard', -apple-system, sans-serif" font-weight="700" font-size="22" fill="#487BE5" letter-spacing="-0.5">클래스</text>
            </svg>
        </RouterLink>
      </div>
      <div class="flex-none flex items-center gap-4">
        <ThemeToggle />
        <RouterLink to="/about" class="btn btn-ghost btn-sm rounded-full font-bold hidden sm:flex">About Us</RouterLink>
        <RouterLink to="/faq" class="btn btn-ghost btn-sm rounded-full font-bold hidden sm:flex">자주 묻는 질문</RouterLink>
        <template v-if="auth.isLoggedIn">
<div class="dropdown dropdown-end">
            <label tabindex="0" class="btn btn-ghost btn-circle avatar online">
              <div class="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm" style="display:flex;align-items:center;justify-content:center;line-height:1">
                {{ auth.user?.name?.charAt(0) || 'U' }}
              </div>
            </label>
            <ul tabindex="0" class="mt-3 z-[1] p-2 shadow-xl menu menu-sm dropdown-content bg-base-100 rounded-2xl w-52 border border-base-300/50">
              <li><RouterLink to="/mypage" class="py-3">마이페이지</RouterLink></li>
              <template v-if="auth.isAdmin || auth.isSeller">
                <li class="menu-title px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-base-content/30">관리</li>
                <li v-if="auth.isAdmin"><RouterLink to="/admin" class="py-3">관리자 대시보드</RouterLink></li>
                <li v-if="auth.isSeller || auth.isAdmin"><RouterLink to="/seller/products" class="py-3">상품 관리</RouterLink></li>
                <li v-if="auth.isSeller"><RouterLink to="/seller/settlements" class="py-3">정산</RouterLink></li>
              </template>
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
      <div class="mb-6 sm:mb-10 flex items-center justify-between gap-4">
        <div class="text-left">
          <h1 class="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-base-content mb-1 sm:mb-2">
            {{ greeting.text(auth.isLoggedIn ? auth.user?.name : null) }} {{ greeting.emoji }}
          </h1>
          <p class="text-base-content/60 text-sm sm:text-lg">{{ subtitle }}</p>
        </div>
        <button
          v-if="auth.isLoggedIn"
          @click="scrollToRecommendations"
          class="hidden sm:flex shrink-0 items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
          style="background: linear-gradient(135deg, #3182f6 0%, #7c4dff 100%); box-shadow: 0 4px 20px rgba(49,130,246,0.35);"
        >
          <span>✨ AI 기반으로 {{ auth.user?.name }}님께 추천드려요</span>
          <svg class="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <!-- Search Bar -->
      <div class="mb-8 sm:mb-12 relative">
        <form @submit.prevent="handleSearch" class="relative group">
          <input
            :value="searchQuery"
            @input="onSearchInput"
            @focus="showSearchDropdown = recentSearchList.length > 0"
            @blur="setTimeout(() => showSearchDropdown = false, 150)"
            type="text"
            placeholder="어떤 클래스를 찾으시나요?"
            class="input w-full h-12 sm:h-16 pl-11 sm:pl-14 pr-20 sm:pr-32 rounded-3xl bg-base-100 border border-base-content/10 shadow-sm focus:shadow-md focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all text-sm sm:text-lg"
          />
          <svg class="w-5 h-5 sm:w-6 sm:h-6 absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-base-content/30 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <button type="submit" class="btn btn-primary absolute right-2 top-2 bottom-2 rounded-2xl px-4 sm:px-8 text-sm shadow-lg shadow-primary/20">
            검색
          </button>
        </form>

        <!-- 최근 검색어 드롭다운 -->
        <div v-if="showSearchDropdown && recentSearchList.length"
          class="absolute top-full left-0 right-0 mt-2 bg-base-100 rounded-2xl border border-base-300/30 shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div class="flex items-center justify-between px-4 py-3 border-b border-base-300/20">
            <span class="text-xs font-black text-base-content/30 uppercase tracking-widest">최근 검색어</span>
            <button @click="recentSearches.clear(); recentSearchList = []" class="text-xs font-black text-base-content/30 hover:text-error transition-colors">전체 삭제</button>
          </div>
          <ul>
            <li v-for="query in recentSearchList" :key="query"
              class="flex items-center justify-between px-4 py-3 hover:bg-base-200/50 transition-colors">
              <button class="flex items-center gap-3 flex-1 text-left" @click="selectRecentSearch(query)">
                <svg class="w-4 h-4 text-base-content/20 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-sm font-bold text-base-content">{{ query }}</span>
              </button>
              <button @click="removeRecentSearch(query)" class="text-base-content/20 hover:text-error transition-colors p-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- 최근 본 클래스 -->
      <div v-if="!searchQuery && recentProductList.length" class="mb-10">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-black text-base-content">최근 본 클래스</h2>
          <button @click="recentProducts.clear(); recentProductList = []" class="text-xs font-black text-base-content/30 hover:text-error transition-colors">전체 삭제</button>
        </div>
        <div class="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          <RouterLink
            v-for="item in recentProductList"
            :key="item.id"
            :to="`/products/${item.id}`"
            class="shrink-0 w-32 card bg-base-100 border border-base-300/20 rounded-[20px] overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all group"
          >
            <div class="aspect-square bg-base-200 overflow-hidden">
              <img v-if="item.thumbnailPath" :src="resolveImageUrl(item.thumbnailPath)" alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div v-else class="w-full h-full flex items-center justify-center text-3xl opacity-20">🎨</div>
            </div>
            <div class="p-3">
              <p class="text-xs font-black line-clamp-2 leading-tight mb-1">{{ item.title }}</p>
              <p v-if="item.price !== null" class="text-xs font-black text-primary">₩{{ Number(item.price).toLocaleString('ko-KR') }}</p>
            </div>
          </RouterLink>
        </div>
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

          <hr class="mb-12 border-base-300/50" />
        </div>
      </transition>

      <!-- Error -->
      <div v-if="errorMessage" role="alert" class="alert bg-error/10 border-none text-error mb-8 rounded-2xl animate-in fade-in slide-in-from-top-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span class="font-semibold">{{ errorMessage }}</span>
      </div>

      <div v-if="!searchQuery && auth.isLoggedIn" id="recommendations" class="mb-12 scroll-mt-20">
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
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-8 mb-16">
          <RouterLink
            v-for="product in products"
            :key="product.id"
            :to="`/products/${product.id}`"
            class="block"
          >
            <ProductCard :product="product" />
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

    <!-- Footer -->
    <footer class="border-t border-base-300/50 bg-base-200/50 py-10 mt-4">
      <div class="max-w-5xl mx-auto px-4 text-center">
        <div class="mb-4">
          <img src="/logo.svg" alt="잡아클래스" class="h-8 mx-auto opacity-40 grayscale" />
        </div>
        <p class="text-base-content/50 text-sm mb-1 font-medium">© 2026 잡아클래스. All rights reserved.</p>
        <p class="text-base-content/30 text-xs mb-1">함께 배우고 성장하는 클래스 플랫폼</p>
        <p class="text-base-content/30 text-xs mb-4">대표자 : ChamomileChicken</p>
        <div class="flex flex-wrap justify-center gap-4 mb-4">
          <RouterLink to="/faq" class="text-xs font-bold text-base-content/30 hover:text-base-content/60 transition-colors">자주 묻는 질문</RouterLink>
          <RouterLink to="/terms" class="text-xs font-bold text-base-content/30 hover:text-base-content/60 transition-colors">이용약관</RouterLink>
          <RouterLink to="/privacy" class="text-xs font-bold text-base-content/30 hover:text-base-content/60 transition-colors">개인정보처리방침</RouterLink>
          <RouterLink to="/refund-policy" class="text-xs font-bold text-base-content/30 hover:text-base-content/60 transition-colors">환불 정책</RouterLink>
        </div>
        <div class="flex items-center justify-center gap-1">
          <span class="text-base-content/20 text-xs">All systems operational</span>
          <svg class="w-3 h-3 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    </footer>
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
