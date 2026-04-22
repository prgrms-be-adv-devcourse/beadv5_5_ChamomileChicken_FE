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

function getPaymentContextKey() { return orderId ? `payment:checkout:${orderId}` : '' }
function loadStoredContext() {
  const key = getPaymentContextKey()
  if (!key) return null
  try { const raw = sessionStorage.getItem(key); return raw ? JSON.parse(raw) : null } catch { return null }
}
function clearStoredContext() { const key = getPaymentContextKey(); if (key) sessionStorage.removeItem(key) }
function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }

onMounted(async () => {
  storedContext.value = loadStoredContext()
  try {
    if (paymentKey) await paymentsApi.confirm(orderId, paymentKey, amount.value)
    if (auth.isLoggedIn) await auth.fetchUser()
    confirmed.value = true
    clearStoredContext()
  } catch (e) { error.value = extractApiMessage(e, '결제 승인 처리 중 오류가 발생했습니다.') }
})
</script>

<template>
  <div class="hero min-h-screen bg-base-200">
    <div class="hero-content w-full max-w-[480px] p-4">
      <div class="card w-full bg-base-100 shadow-sm border border-base-300/30 rounded-[40px] overflow-hidden animate-in fade-in zoom-in duration-500">
        <div class="card-body p-8 lg:p-12 items-center text-center">

          <template v-if="confirmed">
            <div class="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mb-8 animate-bounce">
              <svg class="w-12 h-12 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="text-3xl font-black text-base-content tracking-tight mb-2">결제가 완료되었어요!</h2>
            <p class="text-base-content/40 font-bold mb-10">이제 새로운 클래스를 즐길 준비가 끝났습니다.</p>
            
            <div class="bg-base-200/50 rounded-3xl p-6 w-full space-y-4 mb-10">
              <div class="flex justify-between items-center">
                <span class="text-sm font-bold text-base-content/40">주문 번호</span>
                <span class="text-xs font-black truncate max-w-[200px]">{{ orderId }}</span>
              </div>
              <div class="flex justify-between items-center border-t border-base-300/30 pt-4">
                <span class="text-sm font-bold text-base-content/40">최종 결제 금액</span>
                <span class="text-xl font-black text-primary tracking-tight">₩{{ formatPrice(totalAmount) }}</span>
              </div>
            </div>

            <div class="flex flex-col w-full gap-3">
              <RouterLink to="/mypage" class="btn btn-primary btn-lg rounded-2xl font-black shadow-xl shadow-primary/20 h-16 border-none">
                주문 내역 확인하기
              </RouterLink>
              <RouterLink to="/products" class="btn btn-ghost btn-lg rounded-2xl font-black h-16">
                다른 클래스 더 보기
              </RouterLink>
            </div>
          </template>

          <template v-else-if="error">
            <div class="w-24 h-24 rounded-full bg-error/10 flex items-center justify-center mb-8">
              <svg class="w-12 h-12 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 class="text-3xl font-black text-base-content tracking-tight mb-2">결제에 실패했어요</h2>
            <p class="text-error font-bold mb-10">{{ error }}</p>
            <div class="flex flex-col w-full gap-3">
              <RouterLink to="/products" class="btn btn-primary btn-lg rounded-2xl font-black shadow-xl shadow-primary/20 h-16 border-none">
                다시 시도하기
              </RouterLink>
            </div>
          </template>

          <template v-else>
            <span class="loading loading-spinner loading-lg text-primary mb-6"></span>
            <p class="text-lg font-black text-base-content animate-pulse">결제 승인 처리 중...</p>
          </template>

        </div>
      </div>
    </div>
  </div>
</template>
