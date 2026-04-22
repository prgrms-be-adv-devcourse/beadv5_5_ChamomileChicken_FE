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
  READY:        { label: '송금 대기', badge: 'badge-warning' },
  HOLD:         { label: '보류',      badge: 'badge-ghost' },
  TRANSFERRING: { label: '송금 중',   badge: 'badge-info' },
  SENT:         { label: '송금 완료', badge: 'badge-success' },
  FAILED:       { label: '송금 실패', badge: 'badge-error' },
}

const TYPE_META = {
  PAYMENT: { label: '결제', badge: 'badge-success' },
  REFUND:  { label: '환불', badge: 'badge-info' },
}

onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
  if (!auth.isSeller) { router.replace('/products'); return }
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
  } finally { loading.value = false }
}

async function logout() {
  try { await authApi.logout() } catch { /* ignore */ }
  auth.clearToken()
  router.push('/login')
}

function statusMeta(status) { return STATUS_META[status] ?? { label: status || '-', badge: 'badge-ghost' } }
function typeMeta(type) { return TYPE_META[type] ?? { label: type || '-', badge: 'badge-ghost' } }
function formatMoney(value) { return Number(value ?? 0).toLocaleString('ko-KR') }
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
function formatDateTime(value) { return value ? String(value).substring(0, 16).replace('T', ' ') : '-' }
function shortId(value) { return value ? String(value).slice(0, 8) : '-' }
</script>

<template>
  <div class="bg-base-200 min-h-screen">
    <div class="navbar bg-base-100 shadow-sm sticky top-0 z-30 px-4 lg:px-8">
      <div class="flex-1">
        <RouterLink to="/products"><img src="/logo.svg" class="h-20" alt="Jaba 클래스" /></RouterLink>
      </div>
      <div class="flex-none flex items-center gap-2">
        <ThemeToggle />
        <RouterLink to="/seller/settlements" class="btn btn-ghost btn-sm">정산 목록</RouterLink>
        <button @click="logout" class="btn btn-ghost btn-sm">로그아웃</button>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="flex items-end justify-between mb-6">
        <div>
          <RouterLink to="/seller/settlements" class="text-sm text-base-content/50 hover:text-primary link link-hover">← 정산 목록으로</RouterLink>
          <h1 class="text-2xl font-bold mt-1">{{ formatMonth(settlement?.settlementMonth) }} 정산 상세</h1>
        </div>
        <button @click="loadDetails(page)" class="btn btn-outline btn-sm">새로고침</button>
      </div>

      <div v-if="error" role="alert" class="alert alert-error mb-4"><span class="text-sm">{{ error }}</span></div>
      <div v-else-if="loading" class="flex justify-center py-24"><span class="loading loading-spinner loading-lg text-primary"></span></div>

      <template v-else-if="settlement">
        <!-- 요약 -->
        <div class="card bg-base-100 shadow-md mb-6">
          <div class="card-body">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h2 class="font-bold text-lg">{{ formatMonth(settlement.settlementMonth) }} 정산</h2>
                  <span :class="statusMeta(settlement.status).badge" class="badge badge-sm">{{ statusMeta(settlement.status).label }}</span>
                </div>
                <p class="text-sm text-base-content/50">등급 {{ settlement.sellerGradeCode }} · 등급 기준 금액 ₩{{ formatMoney(settlement.gradeBaseAmount) }}</p>
                <p v-if="settlement.failReason" class="text-sm text-error mt-1">{{ settlement.failReason }}</p>
              </div>
              <p class="text-sm text-base-content/50">송금일 {{ formatDateTime(settlement.transferredAt) }}</p>
            </div>

            <div class="stats stats-horizontal shadow bg-base-200 w-full">
              <div class="stat">
                <div class="stat-title">기준 금액</div>
                <div class="stat-value text-2xl">₩{{ formatMoney(summary.originalAmount) }}</div>
              </div>
              <div class="stat">
                <div class="stat-title">수수료 · {{ formatRate(settlement.feeRate) }}</div>
                <div class="stat-value text-2xl text-error">-₩{{ formatMoney(summary.feeAmount) }}</div>
              </div>
              <div class="stat">
                <div class="stat-title">최종 정산액</div>
                <div class="stat-value text-2xl text-primary">₩{{ formatMoney(summary.settlementAmount) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 계산 상세 -->
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-bold">계산 상세</h2>
          <p class="text-sm text-base-content/50">총 {{ totalElements }}건</p>
        </div>

        <div v-if="details.length === 0" class="card bg-base-100 shadow-sm"><div class="card-body text-center text-base-content/40 py-12">상세 항목이 없습니다.</div></div>

        <div v-else class="space-y-3">
          <div v-for="item in details" :key="item.settlementTargetCalculationId" class="card bg-base-100 shadow-sm">
            <div class="card-body py-4">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-2">
                    <span :class="typeMeta(item.targetType).badge" class="badge badge-sm">{{ typeMeta(item.targetType).label }}</span>
                    <span class="text-xs text-base-content/40">{{ item.calculationStatus }}</span>
                  </div>
                  <p class="font-bold">주문 {{ shortId(item.orderId) }} · 상품 {{ shortId(item.productId) }}</p>
                  <p class="text-xs text-base-content/40 mt-1">발생 {{ formatDateTime(item.occurredAt) }} · 계산 {{ formatDateTime(item.calculatedAt) }}</p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-xs text-base-content/50">
                    <p>결제 ID: {{ shortId(item.paymentId) }}</p>
                    <p>환불 ID: {{ shortId(item.refundId) }}</p>
                    <p>프로모션: {{ item.appliedPromotionType || '-' }}</p>
                  </div>
                </div>

                <div class="stats stats-horizontal bg-base-200 rounded-xl shadow-none shrink-0">
                  <div class="stat py-2 px-3">
                    <div class="stat-title text-xs">대상 금액</div>
                    <div class="stat-value text-sm font-bold">₩{{ formatMoney(item.targetSettlementBaseAmount) }}</div>
                  </div>
                  <div class="stat py-2 px-3">
                    <div class="stat-title text-xs">계산 금액</div>
                    <div class="stat-value text-sm font-bold">₩{{ formatMoney(item.calculatedSettlementBaseAmount) }}</div>
                  </div>
                  <div class="stat py-2 px-3">
                    <div class="stat-title text-xs">적용 수수료</div>
                    <div class="stat-value text-sm font-bold">{{ formatRate(item.appliedFeeRate) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-center mt-8">
          <div class="join">
            <button @click="loadDetails(page - 1)" :disabled="page <= 0 || loading" class="join-item btn btn-outline btn-sm">이전</button>
            <span class="join-item btn btn-outline btn-sm no-animation cursor-default">{{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
            <button @click="loadDetails(page + 1)" :disabled="!hasNext || loading" class="join-item btn btn-outline btn-sm">다음</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>