<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { ordersApi } from '@/api/orders'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { loadKakaoMaps } from '@/utils/loadKakao'
import { extractApiData, extractApiMessage } from '@/utils/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const product = ref(null)
const schedules = ref([])
const reviews = ref([])
const likedMap = ref({}) // scheduleId → likeId
const mapEl = ref(null)
const mapError = ref('')

const lightboxImg = ref('')
const showLightbox = ref(false)

// 주문 모달
const showModal = ref(false)
const modalSchedule = ref(null)
const quantity = ref(1)
const depositInput = ref(0)
const orderError = ref('')

// 리뷰
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
  AVAILABLE: { label: '예약 가능', color: 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300' },
  FULL: { label: '마감', color: 'bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-300' },
  CLOSED: { label: '종료', color: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' },
  PENDING: { label: '대기중', color: 'bg-yellow-50 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400' },
}

function scheduleStatus(status) {
  const normalizedStatus = String(status ?? '').trim().toUpperCase()
  const normalizedLabel = String(status ?? '').trim()

  if (
    normalizedStatus === 'AVAILABLE' ||
    normalizedLabel === '예약 가능' ||
    normalizedLabel === '예약가능'
  ) {
    return { label: SCHEDULE_STATUS.AVAILABLE.label, color: 'bg-lime-50 dark:bg-lime-900/40 text-lime-700 dark:text-lime-300' }
  }

  return SCHEDULE_STATUS[status] ?? { label: status, color: 'bg-gray-100 dark:bg-gray-700 text-gray-500' }
}

function canReserveSchedule(schedule) {
  return String(schedule?.status ?? '').trim().toUpperCase() !== 'FULL'
}

async function renderMap() {
  if (!mapEl.value || !productLatitude.value || !productLongitude.value) return

  try {
    const kakao = await loadKakaoMaps()
    const position = new kakao.maps.LatLng(productLatitude.value, productLongitude.value)
    const map = new kakao.maps.Map(mapEl.value, {
      center: position,
      level: 3,
    })

    new kakao.maps.Marker({
      position,
      map,
    })
  } catch {
    mapError.value = '지도를 불러오지 못했습니다.'
  }
}

onMounted(async () => {
  if (auth.isLoggedIn && !auth.user) await auth.fetchUser()

  const [productRes, scheduleRes] = await Promise.all([
    productsApi.detail(route.params.productId),
    productsApi.schedules(route.params.productId),
  ])
  product.value = productRes.data?.data ?? productRes.data
  schedules.value = scheduleRes.data?.data ?? scheduleRes.data ?? []

  await nextTick()
  await renderMap()
  loadReviews()

  if (auth.isLoggedIn) {
    try {
      const likesRes = await productsApi.myLikes()
      const likesList = likesRes.data?.data ?? []
      likesList.forEach(like => {
        likedMap.value[like.productScheduleId] = like.id
      })
    } catch { /* ignore */ }
  }
})

async function loadReviews() {
  try {
    const res = await productsApi.reviews(route.params.productId)
    reviews.value = res.data?.data ?? res.data ?? []
  } catch {
    reviews.value = []
  }
}

function openLightbox(url) {
  lightboxImg.value = url
  showLightbox.value = true
}
function closeLightbox(e) {
  if (e && e.target !== e.currentTarget) return
  showLightbox.value = false
}

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

  if (count < 1) {
    orderError.value = '예약 수량은 1명 이상이어야 합니다.'
    return
  }
  if (dep > depositBalance.value) {
    orderError.value = '예치금 잔액을 초과할 수 없습니다.'
    return
  }
  if (dep > totalPrice.value) {
    orderError.value = '사용 예치금은 주문 금액을 초과할 수 없습니다.'
    return
  }
  if (count > reservableCapacity.value) {
    orderError.value = '선택한 일정의 예약 가능 인원을 초과했습니다.'
    return
  }

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
        orderId: order.id,
        productId: order.productId,
        buyerId: order.buyerId,
        amount: order.paymentAmount,
        depositAmount: order.depositAmount,
        totalAmount: order.totalAmount,
        quantity: order.quantity,
        productTitle: product.value.title,
        scheduleDt: modalSchedule.value.scheduleDt,
        startTime: modalSchedule.value.startTime,
        endTime: modalSchedule.value.endTime,
      },
    })
  } catch (e) {
    orderError.value = extractApiMessage(e, '주문 생성에 실패했습니다.')
  }
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
  } catch (e) {
    alert(e.response?.data?.message || '찜 처리에 실패했습니다.')
  }
}

async function submitReview() {
  reviewError.value = ''
  reviewSuccess.value = ''
  if (!reviewContent.value.trim()) {
    reviewError.value = '리뷰 내용을 입력해주세요.'; return
  }
  try {
    await productsApi.createReview(route.params.productId, {
      rating: reviewRating.value,
      content: reviewContent.value,
    })
    reviewContent.value = ''
    reviewRating.value = 5
    reviewSuccess.value = '리뷰가 등록되었습니다.'
    await loadReviews()
  } catch (e) {
    reviewError.value = e.response?.data?.message || '리뷰 등록에 실패했습니다.'
  }
}

async function deleteReview(reviewId) {
  if (!confirm('리뷰를 삭제하시겠습니까?')) return
  try {
    await productsApi.deleteReview(route.params.productId, reviewId)
    await loadReviews()
  } catch (e) {
    alert(e.response?.data?.message || '리뷰 삭제에 실패했습니다.')
  }
}

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }
function formatDate(dt) { return dt ? dt.substring(0, 10) : '' }
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen py-10">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between mb-8">
        <RouterLink to="/products"
          class="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          목록으로
        </RouterLink>
        <ThemeToggle />
      </div>

      <template v-if="product">
        <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-8 border border-gray-200 dark:border-gray-800 mb-10 shadow-lg">
          <p class="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">판매자: {{ product.sellerName }}</p>
          <h2 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4">{{ product.title }}</h2>
          <p class="text-2xl font-bold mb-6">₩{{ formatPrice(product.price) }}</p>
          <div class="border-t border-gray-100 dark:border-gray-800 pt-6">
            <p class="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{{ product.description }}</p>
          </div>
        </div>

        <div v-if="productLatitude && productLongitude"
          class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-8 border border-gray-200 dark:border-gray-800 mb-10 shadow-lg">
          <div class="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100">위치</h3>
              <p v-if="productAddress" class="mt-2 text-sm text-gray-500 dark:text-gray-400 break-words">
                {{ productAddress }}
              </p>
            </div>
            <span v-if="product.zonecode"
              class="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              {{ product.zonecode }}
            </span>
          </div>
          <div ref="mapEl" class="w-full h-80 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#121212]"></div>
          <p v-if="mapError" class="mt-3 text-sm text-red-500">{{ mapError }}</p>
        </div>

        <div v-if="product.imagePaths?.length" class="mb-10">
          <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">상품 이미지</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div v-for="url in product.imagePaths" :key="url"
              class="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 aspect-square cursor-pointer"
              @click="openLightbox(url)">
              <img :src="url" alt="상품 이미지" class="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
            </div>
          </div>
        </div>

        <div v-if="showLightbox"
          class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          @click="closeLightbox">
          <button @click="showLightbox = false"
            class="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img :src="lightboxImg" alt="확대 이미지"
            class="max-w-3xl max-h-[80vh] w-full object-contain rounded-xl shadow-2xl"
            @click.stop />
        </div>

        <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">예약 가능 일정</h3>

        <div v-if="schedules.length"
          class="bg-white dark:bg-[#1e1e1e] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg mb-10">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-600 dark:text-gray-400">
              <thead class="text-xs text-gray-600 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th class="px-6 py-4 font-medium">날짜</th>
                  <th class="px-6 py-4 font-medium">시간</th>
                  <th class="px-6 py-4 font-medium">예약 가능 인원</th>
                  <th class="px-6 py-4 font-medium">상태</th>
                  <th class="px-6 py-4 font-medium text-right">예약 / 찜</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="schedule in schedules" :key="schedule.id"
                  class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200 font-medium">{{ schedule.scheduleDt }}</td>
                  <td class="px-6 py-4">{{ schedule.startTime }} ~ {{ schedule.endTime }}</td>
                  <td class="px-6 py-4">{{ schedule.capacity }}명 / 최대 {{ product.maxCapacity }}명</td>
                  <td class="px-6 py-4">
                    <span :class="scheduleStatus(schedule.status).color" class="px-2.5 py-1 rounded-full text-xs font-medium">
                      {{ scheduleStatus(schedule.status).label }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button @click="toggleLike(schedule)"
                        class="p-2 rounded-lg border transition-colors"
                        :class="likedMap[schedule.id]
                          ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-red-500'
                          : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-300'">
                        <svg class="w-4 h-4" :fill="likedMap[schedule.id] ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </button>
                      <button @click="openModal(schedule)"
                        :disabled="!canReserveSchedule(schedule)"
                        class="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed">
                        예약하기
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center mb-10">
          <p class="text-gray-400 dark:text-gray-500">등록된 일정이 없습니다.</p>
        </div>

        <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">리뷰</h3>

        <div v-if="auth.isLoggedIn" class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-6">
          <h4 class="font-bold text-gray-800 dark:text-gray-100 mb-4">리뷰 작성</h4>

          <div class="flex gap-1 mb-4">
            <button v-for="n in 5" :key="n" @click="reviewRating = n" type="button">
              <svg class="w-7 h-7 transition-colors" :class="n <= reviewRating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
            <span class="ml-2 text-sm text-gray-500 dark:text-gray-400 self-center">{{ reviewRating }}점</span>
          </div>

          <textarea v-model="reviewContent" rows="3" placeholder="리뷰를 작성해주세요"
            class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none mb-3"></textarea>

          <div v-if="reviewError" class="text-red-500 text-sm mb-3">{{ reviewError }}</div>
          <div v-if="reviewSuccess" class="text-green-600 dark:text-green-400 text-sm mb-3">{{ reviewSuccess }}</div>

          <button @click="submitReview"
            class="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
            리뷰 등록
          </button>
        </div>

        <div v-if="reviews.length" class="space-y-4 mb-10">
          <div v-for="review in reviews" :key="review.id"
            class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
            <div class="flex items-start justify-between mb-2">
              <div>
                <div class="flex gap-0.5 mb-1">
                  <svg v-for="n in 5" :key="n" class="w-4 h-4"
                    :class="n <= review.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'"
                    fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <span class="text-xs text-gray-400 dark:text-gray-500">{{ formatDate(review.createdAt) }}</span>
              </div>
              <button v-if="review.userId === auth.user?.userId" @click="deleteReview(review.id)"
                class="text-xs text-red-400 hover:text-red-600 transition-colors">
                삭제
              </button>
            </div>
            <p class="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{{ review.content }}</p>
          </div>
        </div>

        <div v-else class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center mb-10">
          <p class="text-gray-400 dark:text-gray-500 text-sm">등록된 리뷰가 없습니다.</p>
        </div>
      </template>
    </div>

    <div v-if="showModal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-8 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-800">
        <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">예약 확인</h3>

        <div class="space-y-2 mb-6 p-4 bg-gray-50 dark:bg-[#121212] rounded-xl">
          <p class="text-sm text-gray-500 dark:text-gray-400">선택한 일정</p>
          <p class="font-semibold text-gray-800 dark:text-gray-100">{{ modalSchedule?.scheduleDt }}</p>
          <p class="text-sm text-gray-600 dark:text-gray-300">{{ modalSchedule?.startTime }} ~ {{ modalSchedule?.endTime }}</p>
        </div>

        <div class="mb-6 space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-sm text-gray-500 dark:text-gray-400">수량</label>
            <input v-model.number="quantity" type="number" min="1" :max="reservableCapacity"
              class="w-24 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-[#121212] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">주문 금액</span>
            <span class="font-bold text-blue-600 dark:text-blue-400">₩{{ formatPrice(totalPrice) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">보유 예치금</span>
            <span class="font-bold text-blue-600 dark:text-blue-400">₩{{ formatPrice(depositBalance) }}</span>
          </div>
          <div>
            <label class="block text-sm text-gray-500 dark:text-gray-400 mb-1">사용할 예치금 (₩)</label>
            <input v-model.number="depositInput" type="number" min="0" :max="Math.min(depositBalance, totalPrice)"
              class="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-[#121212] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0" />
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">0 입력 시 전액 카드로 결제됩니다.</p>
          </div>
        </div>

        <div v-if="orderError" class="text-red-500 text-sm mb-4">{{ orderError }}</div>

        <div class="flex gap-3">
          <button @click="closeModal"
            class="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            취소
          </button>
          <button @click="submitOrder"
            class="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            예약하기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
