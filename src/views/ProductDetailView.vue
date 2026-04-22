<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { ordersApi } from '@/api/orders'
import { authApi } from '@/api/auth'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { loadKakaoMaps } from '@/utils/loadKakao'
import { extractApiData, extractApiMessage } from '@/utils/api'
import { resolveImageUrl } from '@/utils/imageUrl'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const product = ref(null)
const schedules = ref([])
const reviews = ref([])
const likedMap = ref({})
const mapEl = ref(null)
const mapError = ref('')
const pageLoading = ref(true)
const pageError = ref('')

const showLightbox = ref(false)
const lightboxIndex = ref(0)

const lightboxImg = computed(() => {
  const paths = product.value?.imagePaths
  if (!paths?.length || lightboxIndex.value < 0 || lightboxIndex.value >= paths.length) return ''
  return resolveImageUrl(paths[lightboxIndex.value])
})

const lightboxImageCount = computed(() => product.value?.imagePaths?.length ?? 0)

const showModal = ref(false)
const modalSchedule = ref(null)
const quantity = ref(1)
const depositInput = ref(0)
const orderError = ref('')

const reviewRating = ref(5)
const reviewContent = ref('')
const reviewError = ref('')
const reviewSuccess = ref('')

const depositBalance = computed(() => auth.user?.deposit ?? 0)
const totalPrice = computed(() => (product.value?.price ?? 0) * quantity.value)
const reservableCapacity = computed(() => Number(modalSchedule.value?.capacity ?? product.value?.maxCapacity ?? 1))
const productLatitude = computed(() => Number(product.value?.latitude ?? product.value?.lat ?? 0))
const productLongitude = computed(() => Number(product.value?.longitude ?? product.value?.lng ?? product.value?.lon ?? 0))
const productAddress = computed(() => {
  const base = product.value?.roadAddress ?? product.value?.address ?? ''
  const detail = product.value?.detailAddress ?? ''
  return [base, detail].filter(Boolean).join(' ')
})

const SCHEDULE_STATUS = {
  AVAILABLE: { label: '예약 가능', color: 'badge-success' },
  FULL: { label: '마감', color: 'badge-error' },
  CLOSED: { label: '종료', color: 'badge-ghost' },
  PENDING: { label: '대기중', color: 'badge-warning' },
}

function scheduleStatus(status) {
  const normalizedStatus = String(status ?? '').trim().toUpperCase()
  const normalizedLabel = String(status ?? '').trim()
  if (normalizedStatus === 'AVAILABLE' || normalizedLabel === '예약 가능' || normalizedLabel === '예약가능') {
    return { label: '예약 가능', color: 'badge-success' }
  }
  return SCHEDULE_STATUS[status] ?? { label: status, color: 'badge-ghost' }
}

function canReserveSchedule(schedule) {
  return String(schedule?.status ?? '').trim().toUpperCase() !== 'FULL'
}

async function renderMap() {
  if (!mapEl.value || !productLatitude.value || !productLongitude.value) return
  try {
    const kakao = await loadKakaoMaps()
    const position = new kakao.maps.LatLng(productLatitude.value, productLongitude.value)
    const map = new kakao.maps.Map(mapEl.value, { center: position, level: 3 })
    new kakao.maps.Marker({ position, map })
  } catch {
    mapError.value = '지도를 불러오지 못했습니다.'
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.user) await auth.fetchUser()
  try {
    const [productRes, scheduleRes] = await Promise.all([
      productsApi.detail(route.params.productId),
      productsApi.schedules(route.params.productId),
    ])
    product.value = productRes.data?.data ?? productRes.data
    schedules.value = scheduleRes.data?.data ?? scheduleRes.data ?? []
  } catch (e) {
    pageError.value = e.response?.data?.message || '상품 정보를 불러오는 데 실패했습니다.'
    pageLoading.value = false
    return
  }
  pageLoading.value = false
  await nextTick()
  await renderMap()
  loadReviews()
  if (auth.isLoggedIn) {
    try {
      const likesRes = await productsApi.myLikes()
      const likesList = likesRes.data?.data ?? []
      likesList.forEach(like => { likedMap.value[like.productScheduleId] = like.id })
    } catch { /* ignore */ }
  }
})

async function loadReviews() {
  try {
    const res = await productsApi.reviews(route.params.productId)
    reviews.value = res.data?.data ?? res.data ?? []
    if (reviews.value.length) console.log('[review]', reviews.value[0])
  } catch { reviews.value = [] }
}

function openLightbox(index) { lightboxIndex.value = index; showLightbox.value = true }
function closeLightbox(e) { if (e && e.target !== e.currentTarget) return; showLightbox.value = false }
function lightboxPrev() { const n = lightboxImageCount.value; if (n <= 1) return; lightboxIndex.value = (lightboxIndex.value - 1 + n) % n }
function lightboxNext() { const n = lightboxImageCount.value; if (n <= 1) return; lightboxIndex.value = (lightboxIndex.value + 1) % n }

function onLightboxKeydown(event) {
  if (!showLightbox.value) return
  if (event.key === 'Escape') { event.preventDefault(); showLightbox.value = false; return }
  if (event.key === 'ArrowLeft') { event.preventDefault(); lightboxPrev(); return }
  if (event.key === 'ArrowRight') { event.preventDefault(); lightboxNext() }
}

watch(showLightbox, (open) => {
  if (open) window.addEventListener('keydown', onLightboxKeydown)
  else window.removeEventListener('keydown', onLightboxKeydown)
})

onUnmounted(() => { window.removeEventListener('keydown', onLightboxKeydown) })

function openModal(schedule) {
  if (!auth.isLoggedIn) { router.push('/login'); return }
  modalSchedule.value = schedule
  quantity.value = 1
  depositInput.value = 0
  orderError.value = ''
  showModal.value = true
}
function closeModal() { showModal.value = false }

async function submitOrder() {
  orderError.value = ''
  const dep = Number(depositInput.value) || 0
  const count = Number(quantity.value) || 0
  if (count < 1) { orderError.value = '예약 수량은 1명 이상이어야 합니다.'; return }
  if (dep > depositBalance.value) { orderError.value = '예치금 잔액을 초과할 수 없습니다.'; return }
  if (dep > totalPrice.value) { orderError.value = '사용 예치금은 주문 금액을 초과할 수 없습니다.'; return }
  if (count > reservableCapacity.value) { orderError.value = '선택한 일정의 예약 가능 인원을 초과했습니다.'; return }
  try {
    const res = await ordersApi.create({
      productId: product.value.id,
      productScheduleId: modalSchedule.value.id,
      quantity: count,
      productPrice: product.value.price,
      depositAmount: dep,
    })
    const order = extractApiData(res)
    showModal.value = false
    router.push({
      name: 'PaymentCheckout',
      query: {
        orderId: order.id, productId: order.productId, buyerId: order.buyerId,
        amount: order.paymentAmount, depositAmount: order.depositAmount,
        totalAmount: order.totalAmount, quantity: order.quantity,
        productTitle: product.value.title,
        scheduleDt: modalSchedule.value.scheduleDt,
        startTime: modalSchedule.value.startTime,
        endTime: modalSchedule.value.endTime,
      },
    })
  } catch (e) { orderError.value = extractApiMessage(e, '주문 생성에 실패했습니다.') }
}

async function toggleLike(schedule) {
  if (!auth.isLoggedIn) { router.push('/login'); return }
  const existingLikeId = likedMap.value[schedule.id]
  try {
    if (existingLikeId) {
      await productsApi.deleteLike(schedule.id, existingLikeId)
      delete likedMap.value[schedule.id]
    } else {
      const res = await productsApi.addLike(schedule.id, 1)
      const likeData = res.data?.data ?? res.data
      likedMap.value[schedule.id] = likeData?.id
    }
  } catch (e) { alert(e.response?.data?.message || '찜 처리에 실패했습니다.') }
}

async function submitReview() {
  reviewError.value = ''
  reviewSuccess.value = ''
  if (!reviewContent.value.trim()) { reviewError.value = '리뷰 내용을 입력해주세요.'; return }
  try {
    await productsApi.createReview(route.params.productId, { rating: reviewRating.value, content: reviewContent.value })
    reviewContent.value = ''
    reviewRating.value = 5
    reviewSuccess.value = '리뷰가 등록되었습니다.'
    await loadReviews()
  } catch (e) { reviewError.value = e.response?.data?.message || '리뷰 등록에 실패했습니다.' }
}

async function deleteReview(reviewId) {
  if (!confirm('리뷰를 삭제하시겠습니까?')) return
  try {
    await productsApi.deleteReview(route.params.productId, reviewId)
    await loadReviews()
  } catch (e) { alert(e.response?.data?.message || '리뷰 삭제에 실패했습니다.') }
}

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }
function formatDate(dt) { return dt ? dt.substring(0, 10) : '' }

async function logout() {
  try { await authApi.logout() } catch { /* ignore */ }
  auth.clearToken()
  router.push('/login')
}
</script>

<template>
  <div class="bg-base-200 min-h-screen pb-32">
    <!-- Navbar -->
    <div class="navbar bg-base-100/80 backdrop-blur-md sticky top-0 z-30 px-4 border-b border-base-300/50">
      <div class="flex-1">
        <button @click="router.back()" class="btn btn-ghost gap-2 rounded-full text-base-content/70">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
          </svg>
          뒤로가기
        </button>
      </div>
      <div class="flex-none flex items-center gap-2">
        <ThemeToggle />
        <RouterLink to="/products" class="btn btn-ghost btn-circle">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
        </RouterLink>
        <template v-if="auth.isLoggedIn">
          <div class="dropdown dropdown-end">
            <label tabindex="0" class="btn btn-ghost btn-circle avatar online">
              <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                {{ auth.user?.name?.charAt(0) || 'U' }}
              </div>
            </label>
            <ul tabindex="0" class="mt-3 z-[1] p-2 shadow-xl menu menu-sm dropdown-content bg-base-100 rounded-2xl w-52 border border-base-300/50">
              <li><RouterLink to="/mypage" class="py-3">마이페이지</RouterLink></li>
              <li><button @click="logout" class="py-3 text-error">로그아웃</button></li>
            </ul>
          </div>
        </template>
        <RouterLink v-else to="/login" class="btn btn-primary btn-sm rounded-full px-6">로그인</RouterLink>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 py-8 lg:py-12">

      <div v-if="pageLoading" class="flex flex-col justify-center items-center py-32 gap-4">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="text-base-content/40 font-medium">클래스 정보를 가져오는 중...</p>
      </div>

      <div v-else-if="pageError" role="alert" class="alert bg-error/10 border-none text-error mb-8 rounded-2xl">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span class="font-bold">{{ pageError }}</span>
      </div>

      <template v-else-if="product">
        <!-- Main Product Card -->
        <div class="card bg-base-100 shadow-sm border border-base-300/30 rounded-[32px] overflow-hidden mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div class="card-body p-8 lg:p-12">
            <div class="flex items-center gap-2 mb-4">
              <span class="px-3 py-1 bg-primary/10 text-primary text-xs font-black rounded-lg uppercase">Special Class</span>
              <span class="text-sm font-bold text-base-content/40">판매자: {{ product.sellerName }}</span>
            </div>
            <h1 class="text-3xl lg:text-5xl font-black text-base-content leading-tight mb-6">
              {{ product.title }}
            </h1>
            <div class="flex items-baseline gap-2 mb-8">
              <span class="text-4xl font-black text-primary tracking-tighter">₩{{ formatPrice(product.price) }}</span>
              <span class="text-base-content/30 font-bold">/ 1인</span>
            </div>
            
            <div class="divider opacity-50"></div>
            
            <div class="prose prose-lg max-w-none text-base-content/70 font-medium leading-relaxed whitespace-pre-line">
              {{ product.description }}
            </div>
          </div>
        </div>

        <!-- Location & Gallery Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <!-- 지도 -->
          <div v-if="productLatitude && productLongitude" class="card bg-base-100 shadow-sm border border-base-300/30 rounded-[32px] overflow-hidden group">
            <div class="card-body p-8">
              <h3 class="text-xl font-black mb-1 flex items-center gap-2">
                <span class="text-2xl">📍</span> 위치 안내
              </h3>
              <p v-if="productAddress" class="text-sm font-bold text-base-content/50 mb-6">{{ productAddress }}</p>
              
              <div class="relative rounded-2xl overflow-hidden border border-base-300/50 h-64 lg:h-full min-h-[250px]">
                <div ref="mapEl" class="w-full h-full grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500"></div>
                <div class="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg flex items-center justify-between">
                  <span class="text-xs font-black text-base-content/70">지도를 드래그하여 확인하세요</span>
                  <button class="btn btn-primary btn-xs rounded-lg">크게보기</button>
                </div>
              </div>
              <p v-if="mapError" class="text-error text-xs mt-3 font-bold">{{ mapError }}</p>
            </div>
          </div>

          <!-- 이미지 갤러리 -->
          <div v-if="product.imagePaths?.length" class="card bg-base-100 shadow-sm border border-base-300/30 rounded-[32px] overflow-hidden">
            <div class="card-body p-8">
              <h3 class="text-xl font-black mb-6 flex items-center gap-2">
                <span class="text-2xl">📸</span> 갤러리
              </h3>
              <div class="grid grid-cols-2 gap-3">
                <div v-for="(url, imgIndex) in product.imagePaths" :key="url"
                  class="rounded-2xl overflow-hidden border border-base-300/50 aspect-square cursor-pointer group/img relative"
                  @click="openLightbox(imgIndex)">
                  <img :src="resolveImageUrl(url)" alt="상품 이미지" class="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500" />
                  <div class="absolute inset-0 bg-primary/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 예약 일정 Section -->
        <div id="schedules" class="mb-12">
          <div class="flex items-center justify-between mb-6 px-4">
            <h3 class="text-2xl font-black flex items-center gap-2">
              <span class="text-3xl">🗓️</span> 예약 가능한 일정
            </h3>
            <span class="text-sm font-bold text-base-content/40">{{ schedules.length }}개 선택 가능</span>
          </div>

          <div v-if="schedules.length" class="space-y-4 px-2">
            <div v-for="schedule in schedules" :key="schedule.id" 
              class="card bg-base-100 shadow-sm border border-base-300/20 rounded-3xl hover:shadow-md hover:border-primary/30 transition-all p-6 group">
              <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div class="flex items-center gap-5">
                  <div class="w-16 h-16 rounded-2xl bg-primary/5 flex flex-col items-center justify-center text-primary border border-primary/10">
                    <span class="text-[10px] font-black opacity-60 uppercase">{{ schedule.scheduleDt.split('-')[1] }}월</span>
                    <span class="text-2xl font-black leading-none">{{ schedule.scheduleDt.split('-')[2] }}</span>
                  </div>
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <p class="text-lg font-black text-base-content">{{ schedule.startTime }} ~ {{ schedule.endTime }}</p>
                      <span :class="scheduleStatus(schedule.status).color" class="badge border-none font-black text-[10px] py-2 px-3">
                        {{ scheduleStatus(schedule.status).label }}
                      </span>
                    </div>
                    <p class="text-sm font-bold text-base-content/40">
                      잔여 {{ schedule.capacity }}명 / 정원 {{ product.maxCapacity }}명
                    </p>
                  </div>
                </div>
                
                <div class="flex items-center gap-3 self-end md:self-center">
                  <button @click="toggleLike(schedule)"
                    class="btn btn-circle btn-ghost bg-base-200/50 hover:bg-error/10 hover:text-error transition-all"
                    :class="likedMap[schedule.id] ? 'text-error bg-error/5' : ''">
                    <svg class="w-6 h-6" :fill="likedMap[schedule.id] ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                  <button @click="openModal(schedule)"
                    :disabled="!canReserveSchedule(schedule)"
                    class="btn btn-primary rounded-2xl px-8 shadow-lg shadow-primary/20 disabled:opacity-30">
                    예약하기
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="card bg-base-100 shadow-sm border border-base-300/20 rounded-[32px] p-16 text-center">
            <p class="text-5xl mb-6">🏜️</p>
            <p class="text-lg font-bold text-base-content/40">현재 예약 가능한 일정이 없어요.</p>
          </div>
        </div>

        <!-- 리뷰 Section -->
        <div class="mb-20">
          <div class="flex items-center justify-between mb-8 px-4">
            <h3 class="text-2xl font-black flex items-center gap-2">
              <span class="text-3xl">💬</span> 리뷰
              <span class="text-primary text-lg ml-1">{{ reviews.length }}</span>
            </h3>
          </div>

          <!-- 리뷰 작성 -->
          <div v-if="auth.isLoggedIn" class="card bg-base-100 shadow-sm border border-base-300/30 rounded-[32px] overflow-hidden mb-10">
            <div class="card-body p-8">
              <h4 class="text-lg font-black mb-6">이 클래스는 어땠나요?</h4>
              <div class="flex gap-2 mb-6 bg-base-200/50 p-4 rounded-2xl w-fit">
                <button v-for="n in 5" :key="n" @click="reviewRating = n" type="button" class="transition-transform active:scale-90">
                  <svg class="w-10 h-10 transition-colors" :class="n <= reviewRating ? 'text-warning' : 'text-base-300'" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
                <span class="ml-4 text-xl font-black text-warning self-center">{{ reviewRating }}점</span>
              </div>
              <textarea v-model="reviewContent" rows="4" 
                placeholder="다른 수강생들에게 도움이 될 생생한 후기를 남겨주세요." 
                class="textarea textarea-ghost bg-base-200/50 rounded-2xl w-full text-lg focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all mb-4"></textarea>
              
              <div v-if="reviewError" class="alert bg-error/10 border-none text-error mb-4 rounded-xl py-3 text-sm font-bold">{{ reviewError }}</div>
              <div v-if="reviewSuccess" class="alert bg-success/10 border-none text-success mb-4 rounded-xl py-3 text-sm font-bold">{{ reviewSuccess }}</div>
              
              <div class="card-actions justify-end">
                <button @click="submitReview" class="btn btn-primary rounded-xl px-10 shadow-lg shadow-primary/20">리뷰 등록</button>
              </div>
            </div>
          </div>

          <div v-if="reviews.length" class="space-y-4 px-2">
            <div v-for="review in reviews" :key="review.id" class="card bg-base-100 shadow-sm border border-base-300/20 rounded-3xl p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary">
                    {{ review.userName?.charAt(0) || '?' }}
                  </div>
                  <div>
                    <p class="text-sm font-black text-base-content mb-0.5">{{ review.userName || '알 수 없음' }}</p>
                    <div class="flex gap-0.5 mb-0.5">
                      <svg v-for="n in 5" :key="n" class="w-3.5 h-3.5" :class="n <= review.rating ? 'text-warning' : 'text-base-300'" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <span class="text-[10px] font-bold text-base-content/30">{{ formatDate(review.createdAt) }}</span>
                  </div>
                </div>
                <button v-if="review.userId === auth.user?.userId" @click="deleteReview(review.id)" 
                  class="btn btn-ghost btn-xs text-error/50 hover:text-error hover:bg-error/5 rounded-lg">삭제</button>
              </div>
              <p class="text-base font-medium text-base-content/80 leading-relaxed px-1">{{ review.content }}</p>
            </div>
          </div>

          <div v-else class="text-center py-20 bg-base-100 rounded-[32px] border border-base-300/20 shadow-sm">
            <p class="text-4xl mb-4">✍️</p>
            <p class="font-bold text-base-content/30">첫 번째 리뷰를 남겨주세요!</p>
          </div>
        </div>
      </template>
    </div>

    <!-- Sticky Bottom Bar -->
    <div v-if="product" class="fixed bottom-0 left-0 right-0 bg-base-100/90 backdrop-blur-xl border-t border-base-300/50 p-4 lg:p-6 z-40 animate-in slide-in-from-bottom-full duration-700">
      <div class="max-w-4xl mx-auto flex items-center justify-between gap-6">
        <div class="hidden md:block">
          <p class="text-xs font-bold text-base-content/40 mb-1">인기 급상승 클래스 🔥</p>
          <p class="text-lg font-black truncate max-w-[300px]">{{ product.title }}</p>
        </div>
        <div class="flex flex-1 md:flex-none items-center gap-4">
          <div class="text-right hidden sm:block">
            <p class="text-xs font-bold text-base-content/40">1인 기준</p>
            <p class="text-xl font-black text-primary">₩{{ formatPrice(product.price) }}</p>
          </div>
          <a href="#schedules" class="btn btn-primary btn-lg flex-1 md:w-64 rounded-2xl shadow-xl shadow-primary/30 text-lg font-black tracking-tight">
            일정 확인하고 예약하기
          </a>
        </div>
      </div>
    </div>

    <!-- 라이트박스 -->
    <div v-if="showLightbox" class="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" @click="closeLightbox">
      <button type="button" @click="showLightbox = false" class="btn btn-circle btn-ghost absolute top-6 right-6 text-white z-10 hover:bg-white/10">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      
      <div class="relative w-full max-w-5xl aspect-video flex items-center justify-center" @click.stop>
        <button v-if="lightboxImageCount > 1" type="button" class="btn btn-circle btn-ghost absolute -left-16 top-1/2 -translate-y-1/2 z-10 text-white/50 hover:text-white transition-all scale-150" aria-label="이전 이미지" @click.stop="lightboxPrev">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button v-if="lightboxImageCount > 1" type="button" class="btn btn-circle btn-ghost absolute -right-16 top-1/2 -translate-y-1/2 z-10 text-white/50 hover:text-white transition-all scale-150" aria-label="다음 이미지" @click.stop="lightboxNext">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg>
        </button>
        
        <img :src="lightboxImg" alt="확대 이미지" class="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300" />
      </div>
      
      <p v-if="lightboxImageCount > 1" class="absolute bottom-10 left-1/2 -translate-x-1/2 text-white font-black text-sm tracking-widest bg-black/40 px-6 py-2 rounded-full border border-white/10">
        {{ lightboxIndex + 1 }} / {{ lightboxImageCount }}
      </p>
    </div>

    <!-- 예약 모달 -->
    <div v-if="showModal" class="modal modal-open backdrop-blur-md">
      <div class="modal-box rounded-[40px] p-8 lg:p-10 shadow-2xl border border-base-300/30">
        <div class="flex items-center justify-between mb-8">
          <h3 class="font-black text-2xl">예약 정보를 확인하세요</h3>
          <button @click="closeModal" class="btn btn-sm btn-circle btn-ghost">✕</button>
        </div>

        <div class="bg-primary/5 border border-primary/10 rounded-3xl p-6 mb-8">
          <p class="text-xs font-black text-primary uppercase tracking-widest mb-3">Selected Schedule</p>
          <p class="text-2xl font-black text-base-content mb-1">{{ modalSchedule?.scheduleDt }}</p>
          <p class="text-lg font-bold text-base-content/60">{{ modalSchedule?.startTime }} ~ {{ modalSchedule?.endTime }}</p>
        </div>

        <div class="space-y-6 mb-10">
          <div class="flex items-center justify-between">
            <label class="text-base font-black text-base-content/60">예약 인원</label>
            <div class="join bg-base-200 rounded-2xl p-1">
              <button @click="quantity > 1 && quantity--" class="btn btn-ghost btn-sm join-item rounded-xl">-</button>
              <input v-model.number="quantity" type="number" readonly class="input input-ghost input-sm join-item w-16 text-center font-black text-lg bg-transparent border-none focus:ring-0" />
              <button @click="quantity < reservableCapacity && quantity++" class="btn btn-ghost btn-sm join-item rounded-xl">+</button>
            </div>
          </div>
          
          <div class="divider opacity-30"></div>
          
          <div class="flex items-center justify-between">
            <span class="text-base font-black text-base-content/60">결제 예정 금액</span>
            <span class="text-2xl font-black text-primary tracking-tight">₩{{ formatPrice(totalPrice) }}</span>
          </div>

          <div class="bg-base-200/50 rounded-3xl p-6 space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-base-content/50">보유 예치금</span>
              <span class="text-sm font-bold text-base-content">₩{{ formatPrice(depositBalance) }}</span>
            </div>
            <div class="form-control">
              <label class="label pt-0"><span class="label-text text-xs font-black text-base-content/40">사용할 예치금</span></label>
              <div class="relative">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 font-black text-base-content/30">₩</span>
                <input v-model.number="depositInput" type="number" min="0" :max="Math.min(depositBalance, totalPrice)" 
                  class="input input-bordered w-full h-14 pl-10 rounded-2xl font-black text-lg border-none bg-white shadow-inner focus:ring-2 focus:ring-primary/20" placeholder="0" />
                <button @click="depositInput = Math.min(depositBalance, totalPrice)" class="btn btn-ghost btn-xs absolute right-3 top-1/2 -translate-y-1/2 font-black text-primary">전액사용</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="orderError" class="alert bg-error/10 border-none text-error py-4 mb-6 text-sm font-black rounded-2xl animate-shake">
          {{ orderError }}
        </div>

        <div class="flex gap-4">
          <button @click="closeModal" class="btn btn-ghost btn-lg flex-1 rounded-2xl font-black">취소</button>
          <button @click="submitOrder" class="btn btn-primary btn-lg flex-1 rounded-2xl font-black shadow-xl shadow-primary/20">
            결제하기
          </button>
        </div>
      </div>
      <div class="modal-backdrop bg-base-content/20" @click="closeModal"></div>
    </div>
  </div>
</template>