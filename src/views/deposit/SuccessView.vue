<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { paymentsApi } from '@/api/payments'

const route = useRoute()
const paymentKey = route.query.paymentKey
const paymentId = route.query.orderId   // Toss의 orderId = depositPrepare의 paymentId
const amount = route.query.amount

const confirmed = ref(false)
const error = ref('')

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }

onMounted(async () => {
  try {
    await paymentsApi.depositConfirm(paymentId, paymentKey, amount)
    confirmed.value = true
  } catch (e) {
    error.value = e.response?.data?.message || '충전 승인 처리 중 오류가 발생했습니다.'
  }
})
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">

      <template v-if="confirmed">
        <h2 class="text-xl font-bold mb-2">충전 완료</h2>
        <p class="text-sm text-gray-500 mb-6">예치금이 성공적으로 충전되었습니다.</p>
        <p class="text-2xl font-bold mb-6">₩{{ formatPrice(amount) }}</p>
        <RouterLink to="/mypage"
          class="inline-block px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          마이페이지로 이동
        </RouterLink>
      </template>

      <template v-else-if="error">
        <h2 class="text-xl font-bold text-red-600 dark:text-red-400 mb-2">충전 실패</h2>
        <p class="text-sm text-gray-500 mb-6">{{ error }}</p>
        <RouterLink to="/deposit/charge"
          class="inline-block px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          다시 시도
        </RouterLink>
      </template>

      <template v-else>
        <p class="text-gray-500 dark:text-gray-400">충전 승인 처리 중...</p>
      </template>

    </div>
  </div>
</template>
