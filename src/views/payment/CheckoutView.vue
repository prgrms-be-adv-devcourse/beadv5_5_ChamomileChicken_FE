<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { paymentsApi } from '@/api/payments'
import ThemeToggle from '@/components/ThemeToggle.vue'

const route = useRoute()
const router = useRouter()

const orderId = route.query.orderId
const productId = route.query.productId
const productUserId = route.query.productUserId
const buyerId = route.query.buyerId
const amount = Number(route.query.amount)        // 카드 결제 금액
const depositAmount = Number(route.query.depositAmount)  // 예치금 사용 금액

const tossClientKey = import.meta.env.VITE_TOSS_CLIENT_KEY
const isPureDeposit = computed(() => amount === 0)

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }

async function startPayment() {
  const paymentMethod = depositAmount > 0 && amount > 0 ? 'HYBRID'
    : depositAmount > 0 ? 'DEPOSIT'
    : 'CARD'

  try {
    await paymentsApi.prepare({
      productId,
      orderId,
      userId: buyerId,
      productUserId,
      paymentMethod,
      paymentAmount: amount,
      depositAmount,
    })
  } catch (e) {
    alert('결제 준비 실패: ' + (e.response?.data?.message || e.message))
    return
  }

  if (isPureDeposit.value) {
    // 예치금 전액 결제 → 컨펌 없이 성공 페이지로
    router.push({ name: 'PaymentSuccess', query: { orderId, amount: 0 } })
    return
  }

  const toss = window.TossPayments(tossClientKey)
  toss.requestPayment('카드', {
    amount,
    orderId,
    orderName: '클래스 예약',
    successUrl: window.location.origin + '/payment/success',
    failUrl: window.location.origin + '/payment/fail',
  })
}

onMounted(() => {
  if (!orderId) router.push('/products')
})
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen flex items-center justify-center p-4">

    <ThemeToggle class="fixed top-4 right-4 bg-white dark:bg-[#1e1e1e] shadow-sm" />

    <div class="w-full max-w-md bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-2xl">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8 text-center">결제 정보 확인</h2>

      <div class="space-y-4 mb-8">
        <div class="flex justify-between items-center py-3 border-b border-gray-100 dark:border-gray-800">
          <span class="text-gray-500 dark:text-gray-400 text-sm">주문 번호</span>
          <span class="font-medium text-gray-700 dark:text-gray-200 text-xs break-all text-right max-w-[60%]">{{ orderId }}</span>
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
        class="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-lg transition duration-200 shadow-[0_0_15px_rgba(37,99,235,0.3)]">
        {{ isPureDeposit ? '예치금으로 결제하기' : '결제하기' }}
      </button>
    </div>
  </div>
</template>
