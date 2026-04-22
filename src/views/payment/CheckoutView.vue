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
    orderId: orderId.value, productTitle: productTitle.value,
    amount: amount.value, depositAmount: depositAmount.value,
    totalAmount: totalAmount.value, quantity: quantity.value, scheduleLabel: scheduleLabel.value,
  }))
}

async function startPayment() {
  if (isPreparing.value) return
  error.value = ''
  isPreparing.value = true
  try {
    await paymentsApi.prepare({
      productId: productId.value, orderId: orderId.value, userId: buyerId.value,
      paymentAmount: amount.value, depositAmount: depositAmount.value,
    })
    storePaymentContext()
    if (isPureDeposit.value) {
      router.replace({ name: 'PaymentSuccess', query: { orderId: orderId.value, amount: 0, depositAmount: depositAmount.value, totalAmount: totalAmount.value } })
      return
    }
    if (!tossClientKey || !window.TossPayments) throw new Error('토스 결제 설정을 확인해주세요.')
    const toss = window.TossPayments(tossClientKey)
    toss.requestPayment('카드', {
      amount: amount.value, orderId: orderId.value, orderName: productTitle.value,
      successUrl: window.location.origin + '/payment/success',
      failUrl: window.location.origin + '/payment/fail',
    })
  } catch (e) { error.value = extractApiMessage(e, '결제 준비에 실패했습니다.') }
  finally { isPreparing.value = false }
}

onMounted(async () => {
  if (!orderId.value) { router.replace('/products'); return }
  if (auth.isLoggedIn && !auth.user) await auth.fetchUser()
})
</script>

<template>
  <div class="hero min-h-screen bg-base-200">
    <ThemeToggle class="fixed top-6 right-6 z-10" />

    <div class="hero-content w-full max-w-[480px] p-4">
      <div class="card w-full bg-base-100 shadow-sm border border-base-300/30 rounded-[40px] overflow-hidden animate-in fade-in zoom-in duration-500">
        <div class="card-body p-8 lg:p-12">
          <div class="flex items-center gap-4 mb-10">
            <button @click="$router.back()" class="btn btn-ghost btn-circle bg-base-200/50">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 class="text-2xl font-black tracking-tight">결제 정보 확인</h2>
          </div>

          <div v-if="error" class="alert bg-error/10 border-none text-error py-4 rounded-2xl mb-8 font-black text-sm animate-shake">
            {{ error }}
          </div>

          <div class="space-y-1 mb-10">
            <div class="flex flex-col gap-1 py-4 border-b border-base-300/30">
              <span class="text-xs font-black text-base-content/30 uppercase">상품 정보</span>
              <span class="text-lg font-black leading-tight">{{ productTitle }}</span>
            </div>
            
            <div class="flex justify-between items-center py-4 border-b border-base-300/30">
              <span class="text-sm font-bold text-base-content/40">예약 일정</span>
              <span class="text-sm font-black text-right">{{ scheduleLabel }}</span>
            </div>

            <div class="flex justify-between items-center py-4 border-b border-base-300/30">
              <span class="text-sm font-bold text-base-content/40">예약 인원</span>
              <span class="text-sm font-black">{{ quantity }}명</span>
            </div>

            <div class="flex justify-between items-center py-4 border-b border-base-300/30">
              <span class="text-sm font-bold text-base-content/40">총 주문 금액</span>
              <span class="text-sm font-black tracking-tight">₩{{ formatPrice(totalAmount) }}</span>
            </div>

            <div class="flex justify-between items-center py-4 border-b border-base-300/30">
              <span class="text-sm font-bold text-base-content/40">예치금 사용</span>
              <span class="text-sm font-black text-info">-₩{{ formatPrice(depositAmount) }}</span>
            </div>

            <div class="flex flex-col items-center justify-center py-10">
              <span class="text-xs font-black text-base-content/40 mb-2 uppercase tracking-[0.2em]">최종 결제 금액</span>
              <span class="text-5xl font-black text-primary tracking-tighter">₩{{ formatPrice(amount) }}</span>
            </div>
          </div>

          <button @click="startPayment" :disabled="isPreparing" 
            class="btn btn-primary btn-lg w-full h-16 rounded-3xl font-black text-lg shadow-xl shadow-primary/20 border-none transition-all active:scale-95">
            <span v-if="isPreparing" class="loading loading-spinner loading-md"></span>
            <span v-else>{{ isPureDeposit ? '예치금으로 전액 결제' : '결제하기' }}</span>
          </button>
          
          <p class="text-center text-[10px] font-bold text-base-content/20 mt-6 uppercase tracking-widest">
            Safe & Secure Payment by Toss
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
