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
  READY: { label: '송금 대기', cls: 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300' },
  HOLD: { label: '보류', cls: 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300' },
  TRANSFERRING: { label: '송금 중', cls: 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300' },
  SENT: { label: '송금 완료', cls: 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300' },
  FAILED: { label: '송금 실패', cls: 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300' },
}

onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
  if (!auth.isSeller) {
    router.replace('/products')
    return
  }
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
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header class="flex justify-between items-center mb-10 pb-4 border-b border-gray-200 dark:border-gray-800">
        <RouterLink to="/products" class="text-2xl font-bold tracking-tight">Jaba 클래스</RouterLink>
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <RouterLink to="/seller/products"
            class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            상품 관리
          </RouterLink>
          <RouterLink to="/mypage"
            class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            마이페이지
          </RouterLink>
          <button @click="logout"
            class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            로그아웃
          </button>
        </div>
      </header>

      <div class="flex items-end justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold">정산 확인</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">월별 정산 금액과 송금 상태를 확인할 수 있습니다.</p>
        </div>
        <button @click="loadSettlements(page)"
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          새로고침
        </button>
      </div>

      <div v-if="error" class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
        {{ error }}
      </div>

      <div v-else-if="loading" class="text-center text-gray-400 dark:text-gray-500 py-20">
        정산 내역을 불러오는 중입니다.
      </div>

      <div v-else-if="settlements.length === 0"
        class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-16 text-center">
        <p class="text-gray-400 dark:text-gray-500">아직 확인할 정산이 없습니다.</p>
      </div>

      <template v-else>
        <div class="mb-3 text-sm text-gray-500 dark:text-gray-400">
          총 {{ totalElements }}건
        </div>

        <div class="space-y-3">
          <RouterLink v-for="settlement in settlements" :key="settlement.id"
            :to="`/seller/settlements/${settlement.id}`"
            class="block bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <p class="text-lg font-bold">{{ formatMonth(settlement.settlementMonth) }} 정산</p>
                  <span :class="statusMeta(settlement.status).cls" class="text-xs border px-2 py-0.5 rounded-full">
                    {{ statusMeta(settlement.status).label }}
                  </span>
                </div>
                <p class="text-xs text-gray-400 dark:text-gray-500">등급 {{ settlement.sellerGradeCode }} · 수수료율 {{ formatRate(settlement.feeRate) }}</p>
                <p v-if="settlement.transferredAt" class="text-xs text-gray-400 dark:text-gray-500 mt-1">송금일 {{ formatDateTime(settlement.transferredAt) }}</p>
                <p v-if="settlement.failReason" class="text-xs text-red-500 mt-1">{{ settlement.failReason }}</p>
              </div>

              <div class="grid grid-cols-3 gap-4 text-right sm:min-w-[360px]">
                <div>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">기준 금액</p>
                  <p class="text-sm font-semibold">₩{{ formatMoney(settlement.originalAmount) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">수수료</p>
                  <p class="text-sm font-semibold text-red-500">-₩{{ formatMoney(settlement.feeAmount) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">정산액</p>
                  <p class="text-base font-bold">₩{{ formatMoney(settlement.settlementAmount) }}</p>
                </div>
              </div>
            </div>
          </RouterLink>
        </div>

        <div class="flex justify-center gap-2 mt-8">
          <button @click="loadSettlements(page - 1)" :disabled="page <= 0 || loading"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            이전
          </button>
          <span class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
            {{ page + 1 }} / {{ Math.max(totalPages, 1) }}
          </span>
          <button @click="loadSettlements(page + 1)" :disabled="!hasNext || loading"
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            다음
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
