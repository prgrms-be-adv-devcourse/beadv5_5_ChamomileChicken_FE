<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { depositsApi } from '@/api/deposits'
import { ordersApi } from '@/api/orders'
import { paymentsApi } from '@/api/payments'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()
const auth = useAuthStore()

const userInfo = ref(null)
const depositHistories = ref([])
const orders = ref([])

const userError = ref('')
const depositError = ref('')
const ordersError = ref('')

onMounted(async () => {
  await auth.fetchUser()
  userInfo.value = auth.user

  try {
    const res = await depositsApi.getHistory()
    depositHistories.value = res.data.data || []
  } catch {
    depositError.value = '예치금 내역을 불러오지 못했습니다.'
  }

  try {
    const res = await ordersApi.list()
    orders.value = res.data.data || []
  } catch {
    ordersError.value = '주문 내역을 불러오지 못했습니다.'
  }
})

async function logout() {
  try { await authApi.logout() } catch { /* ignore */ }
  auth.clearToken()
  router.push('/login')
}

async function refund(orderId) {
  if (!confirm('이 주문을 환불하시겠습니까?')) return
  try {
    await paymentsApi.refund(orderId, '단순 변심')
    const res = await ordersApi.list()
    orders.value = res.data.data || []
  } catch (e) {
    alert(e.response?.data?.message || '환불 처리에 실패했습니다.')
  }
}

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }
function formatDate(dt) { return dt ? dt.substring(0, 16).replace('T', ' ') : '' }
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <!-- 헤더 -->
      <header class="flex justify-between items-center mb-10 pb-4 border-b border-gray-200 dark:border-gray-800">
        <RouterLink to="/products" class="text-2xl font-bold tracking-tight">Jaba 클래스</RouterLink>
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <span class="text-sm text-gray-500 dark:text-gray-400">마이페이지</span>
          <button @click="logout"
            class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            로그아웃
          </button>
        </div>
      </header>

      <!-- 내 정보 + 예치금 -->
      <div v-if="userError" class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">{{ userError }}</div>

      <div v-if="userInfo" class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-8">
        <h2 class="text-lg font-bold mb-5">내 정보</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">이름</p>
            <p class="text-sm font-medium">{{ userInfo.name }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">이메일</p>
            <p class="text-sm font-medium">{{ userInfo.email }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">전화번호</p>
            <p class="text-sm font-medium">{{ userInfo.phone }}</p>
          </div>
        </div>
        <div class="border-t border-gray-100 dark:border-gray-700 pt-5 flex items-center justify-between">
          <div>
            <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">예치금 잔액</p>
            <p class="text-3xl font-bold">₩{{ formatPrice(userInfo.deposit) }}</p>
          </div>
          <RouterLink to="/deposit/charge"
            class="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
            충전하기
          </RouterLink>
        </div>
      </div>

      <!-- 예치금 내역 -->
      <div class="mb-10">
        <h2 class="text-lg font-bold mb-4">예치금 내역</h2>

        <div v-if="depositError" class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">{{ depositError }}</div>

        <div v-else-if="depositHistories.length === 0"
          class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
          예치금 내역이 없습니다.
        </div>

        <div v-else class="space-y-2">
          <div v-for="item in depositHistories" :key="item.depositHistoryId"
            class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
            <div class="flex flex-col gap-1">
              <span v-if="item.type === 'CHARGE'" class="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                충전
              </span>
              <span v-else-if="item.type === 'USE'" class="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" /></svg>
                사용
              </span>
              <span v-else-if="item.type === 'REFUND'" class="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                환불
              </span>
              <span v-else class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ item.type }}</span>
              <span v-if="item.createdAt" class="text-xs text-gray-400 dark:text-gray-600">{{ formatDate(item.createdAt) }}</span>
            </div>
            <span :class="{
              'text-green-600 dark:text-green-400': item.type === 'CHARGE' || item.type === 'REFUND',
              'text-red-600 dark:text-red-400': item.type === 'USE',
              'text-gray-700 dark:text-gray-300': !['CHARGE','USE','REFUND'].includes(item.type),
            }" class="text-base font-bold">
              {{ item.type === 'USE' ? '-' : '+' }}₩{{ formatPrice(item.amount) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 주문 내역 -->
      <div>
        <h2 class="text-lg font-bold mb-4">주문 내역</h2>

        <div v-if="ordersError" class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">{{ ordersError }}</div>

        <div v-else-if="orders.length === 0"
          class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
          주문 내역이 없습니다.
        </div>

        <div v-else class="space-y-3">
          <div v-for="order in orders" :key="order.id"
            class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex gap-4 items-start">

            <div class="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-400 shrink-0">
              <img v-if="order.productDescriptionImage" :src="order.productDescriptionImage" alt="상품 이미지" class="w-full h-full object-cover" />
              <span v-else>이미지 없음</span>
            </div>

            <div class="flex-1 min-w-0 space-y-1">
              <p class="font-bold text-base text-gray-800 dark:text-gray-100">
                {{ order.productTitle || '상품 정보 없음' }}
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500 break-all">주문 번호: {{ order.id }}</p>
              <p class="text-sm font-bold">₩{{ formatPrice(order.totalAmount) }}</p>
              <span :class="{
                'bg-yellow-50 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400': order.status === 'PENDING',
                'bg-green-50 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400': order.status === 'PAID',
                'bg-red-50 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400': order.status === 'FAILED',
                'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400': order.status === 'CANCELED',
              }" class="inline-block px-2 py-1 border rounded text-xs">
                {{ { PENDING: '결제 대기', PAID: '결제 완료', FAILED: '결제 실패', CANCELED: '취소됨' }[order.status] || order.status }}
              </span>
            </div>

            <div class="flex flex-col gap-2 shrink-0">
              <RouterLink v-if="order.productId" :to="`/products/${order.productId}`"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-xs text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                상품 보기
              </RouterLink>
              <button v-if="order.status === 'PAID'" @click="refund(order.id)"
                class="px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs w-full transition-colors">
                환불
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
