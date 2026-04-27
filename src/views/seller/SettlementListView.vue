<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { settlementsApi } from '@/api/settlements'
import { extractApiData, extractApiMessage } from '@/utils/api'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()
const auth = useAuthStore()

const settlements = ref([])
const loading = ref(true)
const error = ref('')
const page = ref(0)
const size = 20
const totalPages = ref(0)
const totalElements = ref(0)
const hasNext = ref(false)

const STATUS_META = {
  READY:        { label: '송금 대기', badge: 'badge-warning' },
  HOLD:         { label: '보류',      badge: 'badge-ghost' },
  TRANSFERRING: { label: '송금 중',   badge: 'badge-info' },
  SENT:         { label: '송금 완료', badge: 'badge-success' },
  FAILED:       { label: '송금 실패', badge: 'badge-error' },
}

onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
  if (!auth.isSeller && !auth.isAdmin) { router.replace('/products'); return }
  await loadSettlements(0)
})

async function loadSettlements(nextPage = 0) {
  loading.value = true
  error.value = ''
  try {
    const res = await settlementsApi.myList({ page: nextPage, size })
    const data = extractApiData(res) ?? {}
    settlements.value = Array.isArray(data) ? data : (data.items ?? data.content ?? [])
    page.value = data.page ?? nextPage
    totalPages.value = data.totalPages ?? 0
    totalElements.value = data.totalElements ?? settlements.value.length
    hasNext.value = Boolean(data.hasNext)
  } catch (e) {
    settlements.value = []
    error.value = extractApiMessage(e, '정산 내역을 불러오지 못했습니다.')
  } finally { loading.value = false }
}

async function logout() {
  try { await authApi.logout() } catch { /* ignore */ }
  auth.clearToken()
  router.push('/login')
}

function statusMeta(status) { return STATUS_META[status] ?? { label: status || '-', badge: 'badge-ghost' } }
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
</script>

<template>
  <div class="bg-base-200 min-h-screen">
    <div class="navbar bg-base-100 shadow-sm sticky top-0 z-30 px-4 lg:px-8">
      <div class="flex-1">
        <RouterLink to="/products">
          <svg width="220" height="50" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg" class="h-10 sm:h-14 w-auto">
            <g transform="translate(10, 5)">
              <rect x="5" y="8" width="24" height="24" rx="8" fill="#E8F0FE" transform="rotate(-12 17 20)" />
              <rect x="12" y="12" width="24" height="24" rx="8" fill="#487BE5" transform="rotate(8 24 24)" />
              <path d="M 38 2 Q 40 8 46 10 Q 40 12 38 18 Q 36 12 30 10 Q 36 8 38 2 Z" fill="#FFC83D" />
            </g>
            <text x="65" y="34" font-family="'Pretendard', -apple-system, sans-serif" font-weight="800" font-size="26" fill="currentColor" letter-spacing="-0.5">Jaba</text>
            <text x="125" y="34" font-family="'Pretendard', -apple-system, sans-serif" font-weight="700" font-size="22" fill="#487BE5" letter-spacing="-0.5">클래스</text>
          </svg>
        </RouterLink>
      </div>
      <div class="flex-none flex items-center gap-2">
        <ThemeToggle />
        <RouterLink to="/seller/products" class="btn btn-ghost btn-sm hidden sm:flex">상품 관리</RouterLink>
        <RouterLink to="/mypage" class="btn btn-ghost btn-sm hidden sm:flex">마이페이지</RouterLink>
        <button @click="logout" class="btn btn-ghost btn-sm">로그아웃</button>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="flex items-end justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold">정산 확인</h1>
          <p class="text-sm text-base-content/50 mt-1">월별 정산 금액과 송금 상태를 확인할 수 있습니다.</p>
        </div>
        <button @click="loadSettlements(page)" class="btn btn-outline btn-sm">새로고침</button>
      </div>

      <div v-if="error" role="alert" class="alert alert-error mb-4"><span class="text-sm">{{ error }}</span></div>
      <div v-else-if="loading" class="flex justify-center py-24"><span class="loading loading-spinner loading-lg text-primary"></span></div>
      <div v-else-if="settlements.length === 0" class="card bg-base-100 shadow-sm"><div class="card-body text-center text-base-content/40 py-16">아직 확인할 정산이 없습니다.</div></div>

      <template v-else>
        <p class="text-sm text-base-content/50 mb-3">총 {{ totalElements }}건</p>

        <div class="space-y-3">
          <RouterLink v-for="settlement in settlements" :key="settlement.id"
            :to="`/seller/settlements/${settlement.id}`"
            class="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
            <div class="card-body py-4">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <p class="font-bold text-lg">{{ formatMonth(settlement.settlementMonth) }} 정산</p>
                    <span :class="statusMeta(settlement.status).badge" class="badge badge-sm">{{ statusMeta(settlement.status).label }}</span>
                  </div>
                  <p class="text-xs text-base-content/50">등급 {{ settlement.sellerGradeCode }} · 수수료율 {{ formatRate(settlement.feeRate) }}</p>
                  <p v-if="settlement.transferredAt" class="text-xs text-base-content/40 mt-1">송금일 {{ formatDateTime(settlement.transferredAt) }}</p>
                  <p v-if="settlement.failReason" class="text-xs text-error mt-1">{{ settlement.failReason }}</p>
                </div>

                <div class="stats stats-horizontal bg-base-200 rounded-xl shadow-none overflow-x-auto">
                  <div class="stat py-2 px-4">
                    <div class="stat-title text-xs">기준 금액</div>
                    <div class="stat-value text-sm font-bold">₩{{ formatMoney(settlement.originalAmount) }}</div>
                  </div>
                  <div class="stat py-2 px-4">
                    <div class="stat-title text-xs">수수료</div>
                    <div class="stat-value text-sm font-bold text-error">-₩{{ formatMoney(settlement.feeAmount) }}</div>
                  </div>
                  <div class="stat py-2 px-4">
                    <div class="stat-title text-xs">정산액</div>
                    <div class="stat-value text-base font-bold text-primary">₩{{ formatMoney(settlement.settlementAmount) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </RouterLink>
        </div>

        <div class="flex justify-center mt-8">
          <div class="join">
            <button @click="loadSettlements(page - 1)" :disabled="page <= 0 || loading" class="join-item btn btn-outline btn-sm">이전</button>
            <span class="join-item btn btn-outline btn-sm no-animation cursor-default">{{ page + 1 }} / {{ Math.max(totalPages, 1) }}</span>
            <button @click="loadSettlements(page + 1)" :disabled="!hasNext || loading" class="join-item btn btn-outline btn-sm">다음</button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>