<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { paymentsApi } from '@/api/payments'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { extractApiMessage } from '@/utils/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const orderId = computed(() => String(route.query.orderId ?? ''))
const productId = computed(() => String(route.query.productId ?? ''))
const buyerId = computed(() => String(route.query.buyerId ?? auth.user?.userId ?? ''))
const amount = computed(() => Number(route.query.amount ?? 0))
const depositAmount = computed(() => Number(route.query.depositAmount ?? 0))
const totalAmount = computed(() => Number(route.query.totalAmount ?? amount.value + depositAmount.value))
const quantity = computed(() => Number(route.query.quantity ?? 1))
const productTitle = computed(() => String(route.query.productTitle ?? '클래스 예약'))
const scheduleLabel = computed(() => {
  const scheduleDt = String(route.query.scheduleDt ?? '')
  const startTime = String(route.query.startTime ?? '')
  const endTime = String(route.query.endTime ?? '')
  return [scheduleDt, startTime && endTime ? `${startTime} ~ ${endTime}` : ''].filter(Boolean).join(' | ')
})

const tossClientKey = import.meta.env.VITE_TOSS_CLIENT_KEY
const isPureDeposit = computed(() => amount.value === 0)
const error = ref('')
const isPreparing = ref(false)
const paymentContextKey = computed(() => `payment:checkout:${orderId.value}`)

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }

function storePaymentContext() {
  if (!orderId.value) return

  sessionStorage.setItem(paymentContextKey.value, JSON.stringify({
    orderId: orderId.value,
    productTitle: productTitle.value,
    amount: amount.value,
    depositAmount: depositAmount.value,
    totalAmount: totalAmount.value,
    quantity: quantity.value,
    scheduleLabel: scheduleLabel.value,
  }))
}

async function startPayment() {
  if (isPreparing.value) return
  error.value = ''
  isPreparing.value = true

  try {
    await paymentsApi.prepare({
      productId: productId.value,
      orderId: orderId.value,
      userId: buyerId.value,
      paymentAmount: amount.value,
      depositAmount: depositAmount.value,
    })

    storePaymentContext()

    if (isPureDeposit.value) {
      router.replace({
        name: 'PaymentSuccess',
        query: {
          orderId: orderId.value,
          amount: 0,
          depositAmount: depositAmount.value,
          totalAmount: totalAmount.value,
        },
      })
      return
    }

    if (!tossClientKey || !window.TossPayments) {
      throw new Error('토스 결제 설정을 확인해주세요.')
    }

    const toss = window.TossPayments(tossClientKey)
    toss.requestPayment('카드', {
      amount: amount.value,
      orderId: orderId.value,
      orderName: productTitle.value,
      successUrl: window.location.origin + '/payment/success',
      failUrl: window.location.origin + '/payment/fail',
    })
  } catch (e) {
    error.value = extractApiMessage(e, '결제 준비에 실패했습니다.')
  } finally {
    isPreparing.value = false
  }
}

onMounted(async () => {
  if (!orderId.value) {
    router.replace('/products')
    return
  }

  if (auth.isLoggedIn && !auth.user) {
    await auth.fetchUser()
  }
})
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen flex items-center justify-center p-4">

    <ThemeToggle class="fixed top-4 right-4 bg-white dark:bg-[#1e1e1e] shadow-sm" />

    <div class="w-full max-w-md bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-2xl">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8 text-center">결제 정보 확인</h2>

      <div v-if="error"
        class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
        {{ error }}
      </div>

      <div class="space-y-4 mb-8">
        <div class="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
          <span class="text-gray-500 dark:text-gray-400 text-sm">상품</span>
          <span class="font-medium text-gray-700 dark:text-gray-200 text-right max-w-[60%]">{{ productTitle }}</span>
        </div>
        <div class="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
          <span class="text-gray-500 dark:text-gray-400 text-sm">주문 번호</span>
          <span class="font-medium text-gray-700 dark:text-gray-200 text-xs break-all text-right max-w-[60%]">{{ orderId }}</span>
        </div>
        <div v-if="scheduleLabel" class="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
          <span class="text-gray-500 dark:text-gray-400 text-sm">예약 일정</span>
          <span class="font-medium text-gray-700 dark:text-gray-200 text-right max-w-[60%]">{{ scheduleLabel }}</span>
        </div>
        <div class="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
          <span class="text-gray-500 dark:text-gray-400 text-sm">예약 인원</span>
          <span class="font-medium text-gray-700 dark:text-gray-200">{{ quantity }}명</span>
        </div>
        <div class="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
          <span class="text-gray-500 dark:text-gray-400 text-sm">총 주문 금액</span>
          <span class="font-medium text-gray-700 dark:text-gray-200">₩{{ formatPrice(totalAmount) }}</span>
        </div>
        <div class="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
          <span class="text-gray-500 dark:text-gray-400 text-sm">예치금 사용</span>
          <span class="font-medium text-gray-700 dark:text-gray-200">-₩{{ formatPrice(depositAmount) }}</span>
        </div>
        <div class="flex justify-between items-center py-4">
          <span class="text-gray-700 dark:text-gray-300 font-medium">최종 결제 금액</span>
          <span class="text-2xl font-bold">₩{{ formatPrice(amount) }}</span>
        </div>
      </div>

      <button @click="startPayment"
        :disabled="isPreparing"
        class="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-lg transition duration-200 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
        {{ isPreparing ? '처리 중...' : (isPureDeposit ? '예치금으로 결제하기' : '결제하기') }}
      </button>
    </div>
  </div>
</template>
