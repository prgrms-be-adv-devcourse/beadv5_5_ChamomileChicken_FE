<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { paymentsApi } from '@/api/payments'
import { extractApiMessage } from '@/utils/api'

const route = useRoute()
const auth = useAuthStore()
const paymentKey = route.query.paymentKey
const depositPaymentsId = route.query.orderId
const amount = Number(route.query.amount ?? 0)

const confirmed = ref(false)
const error = ref('')

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }

onMounted(async () => {
  try {
    await paymentsApi.depositConfirm(depositPaymentsId, paymentKey, amount)
    if (auth.isLoggedIn) await auth.fetchUser()
    confirmed.value = true
  } catch (e) { error.value = extractApiMessage(e, '충전 승인 처리 중 오류가 발생했습니다.') }
})
</script>

<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center overflow-y-auto py-8">
    <div class="w-full max-w-[480px] px-4">
      <div class="card w-full bg-base-100 shadow-sm border border-base-300/30 rounded-[40px] overflow-hidden animate-in fade-in zoom-in duration-500">
        <div class="card-body p-6 sm:p-8 lg:p-12 items-center text-center">

          <template v-if="confirmed">
            <div class="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mb-8 animate-bounce">
              <svg class="w-12 h-12 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="text-3xl font-black text-base-content tracking-tight mb-2">충전이 완료되었어요!</h2>
            <p class="text-base-content/40 font-bold mb-10">예치금이 성공적으로 충전되었습니다.</p>
            
            <div class="bg-primary/5 border border-primary/10 rounded-3xl p-8 w-full mb-10 text-center">
              <p class="text-xs font-black text-primary uppercase tracking-[0.2em] mb-2">Refilled Amount</p>
              <div class="text-4xl font-black text-primary tracking-tighter">₩{{ formatPrice(amount) }}</div>
            </div>

            <div class="flex flex-col w-full gap-3">
              <RouterLink to="/mypage" class="btn btn-primary btn-lg rounded-2xl font-black shadow-xl shadow-primary/20 h-16 border-none">
                마이페이지에서 확인하기
              </RouterLink>
              <RouterLink to="/products" class="btn btn-ghost btn-lg rounded-2xl font-black h-16">
                클래스 구경가기
              </RouterLink>
            </div>
          </template>

          <template v-else-if="error">
            <div class="w-24 h-24 rounded-full bg-error/10 flex items-center justify-center mb-8">
              <svg class="w-12 h-12 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 class="text-3xl font-black text-base-content tracking-tight mb-2">충전에 실패했어요</h2>
            <p class="text-error font-bold mb-10">{{ error }}</p>
            <div class="flex flex-col w-full gap-3">
              <RouterLink to="/deposit/charge" class="btn btn-primary btn-lg rounded-2xl font-black shadow-xl shadow-primary/20 h-16 border-none">
                다시 시도하기
              </RouterLink>
            </div>
          </template>

          <template v-else>
            <span class="loading loading-spinner loading-lg text-primary mb-6"></span>
            <p class="text-lg font-black text-base-content animate-pulse">충전 승인 처리 중...</p>
          </template>

        </div>
      </div>
    </div>
  </div>
</template>
