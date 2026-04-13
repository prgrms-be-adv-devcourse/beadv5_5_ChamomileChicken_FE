<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { paymentsApi } from '@/api/payments'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()
const auth = useAuthStore()

const amountInput = ref('')
const error = ref('')
const tossClientKey = import.meta.env.VITE_TOSS_CLIENT_KEY

onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
})

function addAmount(value) {
  amountInput.value = String((parseInt(amountInput.value) || 0) + value)
  error.value = ''
}
function resetAmount() {
  amountInput.value = ''
  error.value = ''
}

async function startPayment() {
  const amount = parseInt(amountInput.value)
  if (!amount || amount < 1000) {
    error.value = '충전 금액은 최소 1,000원 이상이어야 합니다.'
    return
  }
  try {
    const res = await paymentsApi.depositPrepare(auth.user?.userId, amount)
    const { paymentId } = res.data.data

    const toss = window.TossPayments(tossClientKey)
    toss.requestPayment('카드', {
      amount,
      orderId: paymentId,
      orderName: '예치금 충전',
      successUrl: window.location.origin + '/deposit/success',
      failUrl: window.location.origin + '/deposit/fail',
    })
  } catch (e) {
    error.value = e.response?.data?.message || '결제 준비에 실패했습니다.'
  }
}

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-2xl">

      <div class="flex items-center justify-between gap-3 mb-8">
        <div class="flex items-center gap-3">
          <RouterLink to="/mypage" class="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </RouterLink>
          <h2 class="text-xl font-bold">예치금 충전</h2>
        </div>
        <ThemeToggle />
      </div>

      <div class="bg-gray-50 dark:bg-[#121212] rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-800">
        <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">현재 예치금 잔액</p>
        <p class="text-2xl font-bold">₩{{ formatPrice(auth.user?.deposit ?? 0) }}</p>
      </div>

      <div v-if="error"
        class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">
        {{ error }}
      </div>

      <div class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">충전 금액 선택</label>
          <div class="grid grid-cols-3 gap-2 mb-3">
            <button v-for="val in [10000, 30000, 50000, 100000, 300000, 500000]" :key="val"
              @click="addAmount(val)"
              class="py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:border-gray-900 dark:hover:border-white hover:text-gray-900 dark:hover:text-white transition-colors">
              +{{ formatPrice(val / 10000) }}만원
            </button>
          </div>
          <div class="relative">
            <input v-model="amountInput" type="number" placeholder="직접 입력 (원)" min="1000"
              class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors pr-16" />
            <button @click="resetAmount"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              초기화
            </button>
          </div>
        </div>

        <button @click="startPayment"
          class="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
          충전하기
        </button>
      </div>
    </div>
  </div>
</template>
