<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { paymentsApi } from '@/api/payments'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { extractApiData, extractApiMessage } from '@/utils/api'

const auth = useAuthStore()

const amountInput = ref('')
const error = ref('')
const tossClientKey = window.__APP_CONFIG__?.VITE_TOSS_CLIENT_KEY || import.meta.env.VITE_TOSS_CLIENT_KEY
const isSubmitting = ref(false)

onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
})

function addAmount(value) { amountInput.value = String((parseInt(amountInput.value) || 0) + value); error.value = '' }
function resetAmount() { amountInput.value = ''; error.value = '' }

async function startPayment() {
  if (isSubmitting.value) return
  const amount = parseInt(amountInput.value)
  if (!amount || amount < 1000) { error.value = '충전 금액은 최소 1,000원 이상이어야 합니다.'; return }
  isSubmitting.value = true
  try {
    const res = await paymentsApi.depositPrepare(auth.user?.userId, amount)
    const data = extractApiData(res)
    const depositPaymentsId = data?.depositPaymentsId
    if (!depositPaymentsId) throw new Error('충전 결제 정보를 생성하지 못했습니다.')
    if (!tossClientKey || !window.TossPayments) throw new Error('토스 결제 설정을 확인해주세요.')
    const toss = window.TossPayments(tossClientKey)
    toss.requestPayment('카드', {
      amount, orderId: depositPaymentsId, orderName: '예치금 충전',
      successUrl: window.location.origin + '/deposit/success',
      failUrl: window.location.origin + '/deposit/fail',
    })
  } catch (e) { error.value = extractApiMessage(e, '결제 준비에 실패했습니다.') }
  finally { isSubmitting.value = false }
}

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }
</script>

<template>
  <div class="hero min-h-screen bg-base-200">
    <ThemeToggle class="fixed top-6 right-6 z-10" />

    <div class="hero-content w-full max-w-[480px] p-4">
      <div class="card w-full bg-base-100 shadow-sm border border-base-300/30 rounded-[40px] overflow-hidden animate-in fade-in zoom-in duration-500">
        <div class="card-body p-8 lg:p-12">
          <div class="flex items-center gap-4 mb-8">
            <button @click="$router.back()" class="btn btn-ghost btn-circle bg-base-200/50">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 class="text-2xl font-black tracking-tight">예치금 충전</h2>
          </div>

          <!-- 잔액 표시 -->
          <div class="bg-primary/5 border border-primary/10 rounded-3xl p-6 mb-8">
            <p class="text-xs font-black text-primary uppercase tracking-widest mb-1">Current Balance</p>
            <div class="flex items-baseline gap-1">
              <span class="text-3xl font-black text-primary tracking-tighter">₩{{ formatPrice(auth.user?.deposit ?? 0) }}</span>
            </div>
          </div>

          <div v-if="error" class="alert bg-error/10 border-none text-error py-4 rounded-2xl mb-6 font-black text-sm animate-shake">
            {{ error }}
          </div>

          <div class="space-y-8">
            <div>
              <label class="label pt-0"><span class="label-text text-xs font-black text-base-content/40 ml-1">충전 금액 선택</span></label>
              <div class="grid grid-cols-2 gap-3 mb-6">
                <button v-for="val in [10000, 50000, 100000, 500000, 1000000, 3000000]" :key="val"
                  @click="addAmount(val)"
                  class="btn bg-base-200 hover:bg-base-300 border-none rounded-2xl font-black text-sm h-14 transition-all active:scale-95">
                  +{{ val >= 10000 ? (val / 10000) + '만' : formatPrice(val) }}원
                </button>
              </div>
              
              <div class="form-control relative mb-2">
                <span class="absolute left-5 top-1/2 -translate-y-1/2 font-black text-base-content/20 text-xl">₩</span>
                <input v-model="amountInput" type="number" placeholder="직접 입력" min="1000"
                  class="input input-lg w-full h-16 pl-12 pr-24 bg-base-200 border-none rounded-3xl font-black text-xl focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all" />
                <button @click="resetAmount" class="btn btn-ghost btn-sm absolute right-4 top-1/2 -translate-y-1/2 font-black text-error/50 hover:text-error hover:bg-error/5 rounded-xl">초기화</button>
              </div>
              <p class="text-center text-xs font-bold text-base-content/30">최소 충전 금액은 1,000원입니다.</p>
            </div>

            <button @click="startPayment" :disabled="isSubmitting" 
              class="btn btn-primary btn-lg w-full h-16 rounded-3xl font-black text-lg shadow-xl shadow-primary/20 border-none transition-all active:scale-95">
              <span v-if="isSubmitting" class="loading loading-spinner loading-md"></span>
              <span v-else>충전하기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
