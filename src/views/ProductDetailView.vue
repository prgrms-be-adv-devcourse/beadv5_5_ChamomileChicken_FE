<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { ordersApi } from '@/api/orders'
import ThemeToggle from '@/components/ThemeToggle.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const product = ref(null)
const schedules = ref([])
const lightboxImg = ref('')
const showLightbox = ref(false)

// 모달 상태
const showModal = ref(false)
const modalSchedule = ref(null)
const quantity = ref(1)
const depositInput = ref(0)
const orderError = ref('')

const depositBalance = computed(() => auth.user?.deposit ?? 0)
const totalPrice = computed(() => (product.value?.price ?? 0) * quantity.value)

onMounted(async () => {
  if (auth.isLoggedIn && !auth.user) await auth.fetchUser()
  const [productRes, scheduleRes] = await Promise.all([
    productsApi.detail(route.params.productId),
    productsApi.schedules(route.params.productId),
  ])
  product.value = productRes.data.data
  schedules.value = scheduleRes.data.data || []
})

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
  if (dep > depositBalance.value) {
    orderError.value = '예치금 잔액을 초과할 수 없습니다.'; return
  }
  try {
    const res = await ordersApi.create(
      product.value.id,
      modalSchedule.value.id,
      quantity.value,
      dep,
    )
    const order = res.data.data
    showModal.value = false
    router.push({
      name: 'PaymentCheckout',
      query: {
        orderId: order.id,
        productId: order.productId,
        productUserId: order.productUserId,
        buyerId: order.buyerId,
        amount: order.paymentAmount,
        depositAmount: order.depositAmount,
      },
    })
  } catch (e) {
    orderError.value = e.response?.data?.message || '주문 생성에 실패했습니다.'
  }
}

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }
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
        <!-- 상품 정보 -->
        <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-8 border border-gray-200 dark:border-gray-800 mb-10 shadow-lg">
          <p class="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">판매자: {{ product.sellerName }}</p>
          <h2 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4">{{ product.title }}</h2>
          <p class="text-2xl font-bold mb-6">₩{{ formatPrice(product.price) }}</p>
          <div class="border-t border-gray-100 dark:border-gray-800 pt-6">
            <p class="text-gray-600 dark:text-gray-300 leading-relaxed">{{ product.description }}</p>
          </div>
        </div>

        <!-- 상품 이미지 -->
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

        <!-- 라이트박스 -->
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

        <!-- 스케줄 -->
        <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">예약 가능 일정</h3>

        <div v-if="schedules.length"
          class="bg-white dark:bg-[#1e1e1e] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-gray-600 dark:text-gray-400">
              <thead class="text-xs text-gray-600 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th class="px-6 py-4 font-medium">날짜</th>
                  <th class="px-6 py-4 font-medium">시간</th>
                  <th class="px-6 py-4 font-medium">인원</th>
                  <th class="px-6 py-4 font-medium">상태</th>
                  <th class="px-6 py-4 font-medium text-right">예약</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="schedule in schedules" :key="schedule.id"
                  class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-gray-800 dark:text-gray-200 font-medium">{{ schedule.scheduleDt }}</td>
                  <td class="px-6 py-4">{{ schedule.startTime }} ~ {{ schedule.endTime }}</td>
                  <td class="px-6 py-4">{{ schedule.maxCapacity }}명</td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300">
                      {{ schedule.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button @click="openModal(schedule)"
                      :disabled="schedule.status !== '예약 가능'"
                      class="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed">
                      예약하기
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center">
          <p class="text-gray-400 dark:text-gray-500">등록된 일정이 없습니다.</p>
        </div>
      </template>
    </div>

    <!-- 예약 모달 -->
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
            <span class="text-sm text-gray-500 dark:text-gray-400">주문 가격</span>
            <span class="font-bold text-blue-600 dark:text-blue-400">₩{{ formatPrice(totalPrice) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <label class="text-sm text-gray-500 dark:text-gray-400">수량</label>
            <input v-model.number="quantity" type="number" min="1" :max="modalSchedule?.maxCapacity"
              class="w-24 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-[#121212] text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">보유 예치금</span>
            <span class="font-bold text-blue-600 dark:text-blue-400">₩{{ formatPrice(depositBalance) }}</span>
          </div>
          <div>
            <label class="block text-sm text-gray-500 dark:text-gray-400 mb-1">사용할 예치금 (₩)</label>
            <input v-model.number="depositInput" type="number" min="0" :max="depositBalance"
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
