<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { paymentsApi } from '@/api/payments'
import { extractApiMessage } from '@/utils/api'

const route = useRoute()
const auth = useAuthStore()
const paymentKey = route.query.paymentKey
const orderId = route.query.orderId

const confirmed = ref(false)
const error = ref('')
const storedContext = ref(null)

const amount = computed(() => Number(route.query.amount ?? storedContext.value?.amount ?? 0))
const totalAmount = computed(() => Number(route.query.totalAmount ?? storedContext.value?.totalAmount ?? amount.value))
const depositAmount = computed(() => Number(route.query.depositAmount ?? storedContext.value?.depositAmount ?? Math.max(totalAmount.value - amount.value, 0)))

function getPaymentContextKey() {
  return orderId ? `payment:checkout:${orderId}` : ''
}

function loadStoredContext() {
  const key = getPaymentContextKey()
  if (!key) return null

  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function clearStoredContext() {
  const key = getPaymentContextKey()
  if (key) {
    sessionStorage.removeItem(key)
  }
}

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }

onMounted(async () => {
  storedContext.value = loadStoredContext()

  try {
    if (paymentKey) {
      await paymentsApi.confirm(orderId, paymentKey, amount.value)
    }

    if (auth.isLoggedIn) {
      await auth.fetchUser()
    }
    confirmed.value = true
    clearStoredContext()
  } catch (e) {
    error.value = extractApiMessage(e, '결제 승인 처리 중 오류가 발생했습니다.')
  }
})
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white min-h-screen flex items-center justify-center p-4">
    <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-10 shadow-2xl border border-gray-200 dark:border-gray-800 text-center max-w-md w-full">

      <template v-if="confirmed">
        <div class="text-5xl mb-4">✅</div>
        <h2 class="text-2xl font-bold text-green-600 dark:text-green-400 mb-4">결제가 완료되었습니다</h2>
        <p class="text-gray-500 dark:text-gray-400 mb-2">주문 번호: <strong class="text-gray-800 dark:text-gray-200">{{ orderId }}</strong></p>
        <p class="text-gray-500 dark:text-gray-400 mb-2">총 주문 금액: <strong class="text-gray-800 dark:text-gray-200">{{ formatPrice(totalAmount) }}원</strong></p>
        <p v-if="depositAmount > 0" class="text-gray-500 dark:text-gray-400 mb-2">예치금 사용 금액: <strong class="text-gray-800 dark:text-gray-200">{{ formatPrice(depositAmount) }}원</strong></p>
        <p v-if="amount > 0" class="text-gray-500 dark:text-gray-400 mb-2">카드 결제 금액: <strong class="text-gray-800 dark:text-gray-200">{{ formatPrice(amount) }}원</strong></p>
        <p class="text-xs text-gray-400 dark:text-gray-500 mb-8">주문 상태 반영에는 잠시 시간이 걸릴 수 있습니다.</p>
        <div class="flex flex-col gap-3">
          <RouterLink to="/mypage"
            class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition">
            주문 내역 보기
          </RouterLink>
          <RouterLink to="/products"
            class="inline-block px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl">
            클래스 더 보기
          </RouterLink>
        </div>
      </template>

      <template v-else-if="error">
        <div class="text-5xl mb-4">❌</div>
        <h2 class="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">결제 승인 실패</h2>
        <p class="text-gray-500 dark:text-gray-400 mb-8">{{ error }}</p>
        <RouterLink to="/products" class="inline-block px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl">다시 시도하기</RouterLink>
      </template>

      <template v-else>
        <p class="text-gray-500 dark:text-gray-400">결제 승인 처리 중...</p>
      </template>

    </div>
  </div>
</template>
