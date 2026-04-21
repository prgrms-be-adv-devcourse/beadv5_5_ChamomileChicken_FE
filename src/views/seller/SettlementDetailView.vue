<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { settlementsApi } from '@/api/settlements'
import { extractApiData, extractApiMessage } from '@/utils/api'
import ThemeToggle from '@/components/ThemeToggle.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const settlement = ref(null)
const details = ref([])
const loading = ref(true)
const error = ref('')
const page = ref(0)
const size = 20
const totalPages = ref(0)
const totalElements = ref(0)
const hasNext = ref(false)

const summary = computed(() => {
  const originalAmount = Number(settlement.value?.originalAmount ?? 0)
  const feeAmount = Number(settlement.value?.feeAmount ?? 0)
  const settlementAmount = Number(settlement.value?.settlementAmount ?? 0)
  return { originalAmount, feeAmount, settlementAmount }
})

const STATUS_META = {
  READY: { label: '송금 대기', cls: 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300' },
  HOLD: { label: '보류', cls: 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300' },
  TRANSFERRING: { label: '송금 중', cls: 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300' },
  SENT: { label: '송금 완료', cls: 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300' },
  FAILED: { label: '송금 실패', cls: 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300' },
}

const TYPE_META = {
  PAYMENT: { label: '결제', cls: 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300' },
  REFUND: { label: '환불', cls: 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300' },
}

onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
  if (!auth.isSeller) {
    router.replace('/products')
    return
  }
  await loadDetails(0)
})

async function loadDetails(nextPage = 0) {
  loading.value = true
  error.value = ''
  try {
    const res = await settlementsApi.myDetails(route.params.settlementId, { page: nextPage, size })
    const data = extractApiData(res) ?? {}
    settlement.value = data.settlement ?? settlement.value
    details.value = data.items ?? data.content ?? []
    page.value = data.page ?? nextPage
    totalPages.value = data.totalPages ?? 0
    totalElements.value = data.totalElements ?? details.value.length
    hasNext.value = Boolean(data.hasNext)
  } catch (e) {
    details.value = []
    error.value = extractApiMessage(e, '정산 상세를 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

async function logout() {
  try { await authApi.logout() } catch { /* ignore */ }
  auth.clearToken()
  router.push('/login')
}

function statusMeta(status) {
  return STATUS_META[status] ?? { label: status || '-', cls: 'bg-gray-100 border-gray-300 text-gray-500' }
}

function typeMeta(type) {
  return TYPE_META[type] ?? { label: type || '-', cls: 'bg-gray-100 border-gray-300 text-gray-500' }
}

function formatMoney(value) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

function formatRate(value) {
  if (value === null || value === undefined || value === '') return '-'
  const numeric = Number(value)
  return `${Number.isInteger(numeric) ? numeric : numeric.toFixed(2)}%`
}

function formatMonth(month) {
  if (!month) return '-'
  const value = String(month)
  return value.length === 6 ? `${value.slice(0, 4)}.${value.slice(4)}` : value.replace('-', '.')
}

function formatDateTime(value) {
  return value ? String(value).substring(0, 16).replace('T', ' ') : '-'
}

function shortId(value) {
  return value ? String(value).slice(0, 8) : '-'
}
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header class="flex justify-between items-center mb-10 pb-4 border-b border-gray-200 dark:border-gray-800">
        <RouterLink to="/products" class="text-2xl font-bold tracking-tight">Jaba 클래스</RouterLink>
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <RouterLink to="/seller/settlements"
            class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            정산 목록
          </RouterLink>
          <button @click="logout"
            class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            로그아웃
          </button>
        </div>
      </header>

      <div class="flex items-end justify-between mb-6">
        <div>
          <RouterLink to="/seller/settlements" class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            정산 목록으로 돌아가기
          </RouterLink>
          <h1 class="text-xl font-bold mt-2">{{ formatMonth(settlement?.settlementMonth) }} 정산 상세</h1>
        </div>
        <button @click="loadDetails(page)"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          새로고침
        </button>
      </div>

      <div v-if="error" class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
        {{ error }}
      </div>

      <div v-else-if="loading" class="text-center text-gray-400 dark:text-gray-500 py-20">
        정산 상세를 불러오는 중입니다.
      </div>

      <template v-else-if="settlement">
        <section class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <h2 class="text-lg font-bold">{{ formatMonth(settlement.settlementMonth) }} 정산</h2>
                <span :class="statusMeta(settlement.status).cls" class="text-xs border px-2 py-0.5 rounded-full">
                  {{ statusMeta(settlement.status).label }}
                </span>
              </div>
              <p class="text-sm text-gray-500 dark:text-gray-400">등급 {{ settlement.sellerGradeCode }} · 등급 기준 금액 ₩{{ formatMoney(settlement.gradeBaseAmount) }}</p>
              <p v-if="settlement.failReason" class="text-sm text-red-500 mt-1">{{ settlement.failReason }}</p>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400">송금일 {{ formatDateTime(settlement.transferredAt) }}</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="bg-gray-50 dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">기준 금액</p>
              <p class="text-2xl font-bold">₩{{ formatMoney(summary.originalAmount) }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">수수료 · {{ formatRate(settlement.feeRate) }}</p>
              <p class="text-2xl font-bold text-red-500">-₩{{ formatMoney(summary.feeAmount) }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-[#151515] border border-gray-200 dark:border-gray-800 rounded-xl p-4">
              <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">최종 정산액</p>
              <p class="text-2xl font-bold">₩{{ formatMoney(summary.settlementAmount) }}</p>
            </div>
          </div>
        </section>

        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-bold">계산 상세</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">총 {{ totalElements }}건</p>
        </div>

        <div v-if="details.length === 0"
          class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center text-gray-400 dark:text-gray-500">
          상세 항목이 없습니다.
        </div>

        <div v-else class="space-y-3">
          <div v-for="item in details" :key="item.settlementTargetCalculationId"
            class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="flex items-center gap-2 mb-2">
                  <span :class="typeMeta(item.targetType).cls" class="text-xs border px-2 py-0.5 rounded-full">
                    {{ typeMeta(item.targetType).label }}
                  </span>
                  <span class="text-xs text-gray-400 dark:text-gray-500">{{ item.calculationStatus }}</span>
                </div>
                <p class="font-bold text-gray-800 dark:text-gray-100">주문 {{ shortId(item.orderId) }} · 상품 {{ shortId(item.productId) }}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  발생 {{ formatDateTime(item.occurredAt) }} · 계산 {{ formatDateTime(item.calculatedAt) }}
                </p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <p>결제 ID: {{ shortId(item.paymentId) }}</p>
                  <p>환불 ID: {{ shortId(item.refundId) }}</p>
                  <p>프로모션: {{ item.appliedPromotionType || '-' }}</p>
                  <p>프로모션 ID: {{ shortId(item.appliedPromotionId) }}</p>
                  <p v-if="item.originalPaymentTargetCalculationId" class="sm:col-span-2">
                    원 결제 계산 ID: {{ shortId(item.originalPaymentTargetCalculationId) }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3 text-right lg:min-w-[380px]">
                <div>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">대상 금액</p>
                  <p class="text-sm font-semibold">₩{{ formatMoney(item.targetSettlementBaseAmount) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">계산 금액</p>
                  <p class="text-sm font-semibold">₩{{ formatMoney(item.calculatedSettlementBaseAmount) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">적용 수수료</p>
                  <p class="text-sm font-semibold">{{ formatRate(item.appliedFeeRate) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-center gap-2 mt-8">
          <button @click="loadDetails(page - 1)" :disabled="page <= 0 || loading"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            이전
          </button>
          <span class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
            {{ page + 1 }} / {{ Math.max(totalPages, 1) }}
          </span>
          <button @click="loadDetails(page + 1)" :disabled="!hasNext || loading"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            다음
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
