<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { paymentsApi } from '@/api/payments'

const route = useRoute()
const paymentKey = route.query.paymentKey
const orderId = route.query.orderId
const amount = route.query.amount

const confirmed = ref(false)
const error = ref('')

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }

onMounted(async () => {
  if (!paymentKey) {
    // 예치금 전액 결제 케이스 (paymentKey 없음)
    confirmed.value = true
    return
  }
  try {
    await paymentsApi.confirm(orderId, paymentKey, amount)
    confirmed.value = true
  } catch (e) {
    error.value = e.response?.data?.message || '결제 승인 처리 중 오류가 발생했습니다.'
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
        <p v-if="amount > 0" class="text-gray-500 dark:text-gray-400 mb-8">결제 금액: <strong class="text-gray-800 dark:text-gray-200">{{ formatPrice(amount) }}원</strong></p>
        <RouterLink to="/products"
          class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition">
          클래스 더 보기
        </RouterLink>
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
