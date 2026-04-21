<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { usersApi } from '@/api/users'
import { depositsApi } from '@/api/deposits'
import { ordersApi } from '@/api/orders'
import { productsApi } from '@/api/products'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { extractApiData, extractApiMessage } from '@/utils/api'

const router = useRouter()
const auth = useAuthStore()

const activeTab = ref('info')
const tabs = [
  { key: 'info', label: '내 정보' },
  { key: 'orders', label: '주문 내역' },
  { key: 'deposits', label: '예치금 내역' },
  { key: 'reviews', label: '내 리뷰' },
  { key: 'likes', label: '찜 목록' },
]

// 내 정보
const userInfo = ref(null)
const editMode = ref(false)
const editName = ref('')
const editPhone = ref('')
const editError = ref('')
const editSuccess = ref('')

// 예치금 내역
const depositHistories = ref([])
const depositError = ref('')

// 주문 내역
const orders = ref([])
const ordersError = ref('')
const ordersLoading = ref(false)
const selectedOrder = ref(null)
const selectedOrderId = ref(null)
const selectedOrderLoading = ref(false)
const orderFilter = ref('ALL')
const orderActionLoadingId = ref(null)
const refundInfos = ref({})
const refundInfoErrors = ref({})

// 리뷰
const myReviews = ref([])
const reviewsLoaded = ref(false)
const reviewsError = ref('')

// 찜 목록
const myLikes = ref([])
const likesLoaded = ref(false)
const likesError = ref('')

onMounted(async () => {
  await auth.fetchUser()
  userInfo.value = auth.user

  try {
    const res = await depositsApi.getHistory()
    depositHistories.value = extractApiData(res)?.items ?? []
    await loadRefundInfos(
      depositHistories.value
        .filter((item) => item.type === 'REFUND' && item.paymentId)
        .map((item) => item.paymentId),
    )
  } catch {
    depositError.value = '예치금 내역을 불러오지 못했습니다.'
  }

  await fetchOrders()
})

async function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'reviews' && !reviewsLoaded.value) {
    reviewsLoaded.value = true
    try {
      const res = await productsApi.myReviews()
      myReviews.value = extractApiData(res) ?? []
    } catch {
      reviewsError.value = '리뷰 내역을 불러오지 못했습니다.'
    }
  }
  if (tab === 'likes' && !likesLoaded.value) {
    likesLoaded.value = true
    try {
      const res = await productsApi.myLikes()
      myLikes.value = extractApiData(res) ?? []
    } catch {
      likesError.value = '찜 목록을 불러오지 못했습니다.'
    }
  }
}

async function fetchOrders() {
  ordersLoading.value = true
  ordersError.value = ''

  try {
    const res = await ordersApi.list(orderFilter.value)
    const data = extractApiData(res) ?? []
    orders.value = Array.isArray(data) ? data : []
    await loadRefundInfos(
      orders.value
        .filter((order) => order.status === 'REFUNDED')
        .map((order) => order.id),
    )

    if (selectedOrder.value) {
      const refreshed = orders.value.find((order) => order.id === selectedOrder.value.id)
      if (refreshed) {
        selectedOrder.value = {
          ...selectedOrder.value,
          ...refreshed,
        }
      }
    }
  } catch {
    ordersError.value = '주문 내역을 불러오지 못했습니다.'
  } finally {
    ordersLoading.value = false
  }
}

async function loadOrderDetail(orderId) {
  if (selectedOrderId.value === orderId && selectedOrder.value?.id === orderId && !selectedOrderLoading.value) {
    selectedOrderId.value = null
    selectedOrder.value = null
    return
  }

  selectedOrderId.value = orderId
  selectedOrderLoading.value = true
  ordersError.value = ''

  try {
    const res = await ordersApi.detail(orderId)
    selectedOrder.value = extractApiData(res)
    if (selectedOrder.value?.status === 'REFUNDED') {
      await loadRefundInfos([orderId])
    }
  } catch (e) {
    ordersError.value = extractApiMessage(e, '주문 상세를 불러오지 못했습니다.')
    selectedOrderId.value = null
  } finally {
    selectedOrderLoading.value = false
  }
}

function startEdit() {
  editName.value = userInfo.value?.name ?? ''
  editPhone.value = userInfo.value?.phone ?? ''
  editError.value = ''
  editSuccess.value = ''
  editMode.value = true
}
function cancelEdit() { editMode.value = false }

async function saveUserInfo() {
  editError.value = ''
  editSuccess.value = ''
  if (!editName.value.trim() || !editPhone.value.trim()) {
    editError.value = '이름과 전화번호를 모두 입력해주세요.'; return
  }
  try {
    await usersApi.updateMe(editName.value, editPhone.value)
    await auth.fetchUser()
    userInfo.value = auth.user
    editMode.value = false
    editSuccess.value = '정보가 수정되었습니다.'
  } catch (e) {
    editError.value = e.response?.data?.message || '정보 수정에 실패했습니다.'
  }
}

async function logout() {
  try { await authApi.logout() } catch { /* ignore */ }
  auth.clearToken()
  router.push('/login')
}

async function refund(orderId) {
  if (!confirm('이 주문을 환불하시겠습니까?')) return

  orderActionLoadingId.value = orderId

  try {
    await ordersApi.refund(orderId)
    await Promise.all([
      fetchOrders(),
      auth.fetchUser(),
    ])
    userInfo.value = auth.user

    if (selectedOrder.value?.id === orderId) {
      await loadOrderDetail(orderId)
    }
  } catch (e) {
    alert(extractApiMessage(e, '환불 처리에 실패했습니다.'))
  } finally {
    orderActionLoadingId.value = null
  }
}

async function loadRefundInfos(orderIds) {
  const uniqueIds = [...new Set((orderIds ?? []).filter(Boolean))]
    .filter((orderId) => !refundInfos.value[orderId])

  if (uniqueIds.length === 0) return

  const entries = await Promise.all(
    uniqueIds.map(async (orderId) => {
      try {
        const res = await ordersApi.getRefundInfo(orderId)
        return { orderId, data: extractApiData(res), error: false }
      } catch {
        return { orderId, data: null, error: true }
      }
    }),
  )

  refundInfos.value = {
    ...refundInfos.value,
    ...Object.fromEntries(entries.filter((entry) => entry.data).map((entry) => [entry.orderId, entry.data])),
  }
  refundInfoErrors.value = {
    ...refundInfoErrors.value,
    ...Object.fromEntries(entries.filter((entry) => entry.error).map((entry) => [entry.orderId, true])),
  }
}

async function removeLike(scheduleId, likeId) {
  try {
    await productsApi.deleteLike(scheduleId, likeId)
    myLikes.value = myLikes.value.filter(l => l.id !== likeId)
  } catch (e) {
    alert(e.response?.data?.message || '찜 삭제에 실패했습니다.')
  }
}

const ORDER_STATUS = {
  PENDING:  { label: '결제 처리 중', cls: 'bg-yellow-50 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400' },
  PAID:     { label: '결제 완료',  cls: 'bg-green-50 dark:bg-green-900/40 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400' },
  FAILED:   { label: '결제 실패',  cls: 'bg-red-50 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400' },
  EXPIRED:  { label: '주문 만료',  cls: 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400' },
  REFUNDED: { label: '환불 완료',  cls: 'bg-blue-50 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400' },
}

function orderStatus(status) {
  return ORDER_STATUS[status] ?? { label: status, cls: 'bg-gray-100 border-gray-300 text-gray-500' }
}

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }
function formatDate(dt) { return dt ? dt.substring(0, 16).replace('T', ' ') : '' }
function formatDateOnly(dt) { return dt ? String(dt).substring(0, 10) : '' }
function formatRefundRate(rate) { return `${Math.round(Number(rate ?? 0) * 100)}%` }
function refundInfoOf(orderId) { return orderId ? refundInfos.value[orderId] ?? null : null }
function hasRefundInfoError(orderId) { return Boolean(orderId && refundInfoErrors.value[orderId]) }
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <!-- 헤더 -->
      <header class="flex justify-between items-center mb-10 pb-4 border-b border-gray-200 dark:border-gray-800">
        <RouterLink to="/products" class="text-2xl font-bold tracking-tight">Jaba 클래스</RouterLink>
        <div class="flex items-center gap-2">
          <ThemeToggle />
          <button @click="logout"
            class="bg-transparent border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            로그아웃
          </button>
        </div>
      </header>

      <!-- 탭 -->
      <div class="flex gap-1 mb-8 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-xl p-1">
        <button v-for="tab in tabs" :key="tab.key"
          @click="switchTab(tab.key)"
          :class="activeTab === tab.key
            ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'"
          class="flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-colors">
          {{ tab.label }}
        </button>
      </div>

      <!-- ============ 내 정보 탭 ============ -->
      <div v-if="activeTab === 'info'">

        <div v-if="userInfo" class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-6">
          <div class="flex items-center justify-between mb-5">
            <h2 class="text-lg font-bold">내 정보</h2>
            <button v-if="!editMode" @click="startEdit"
              class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-lg transition-colors">
              수정
            </button>
          </div>

          <!-- 조회 모드 -->
          <template v-if="!editMode">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
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
              <div>
                <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">역할</p>
                <p class="text-sm font-medium">{{ userInfo.role === 'SELLER' ? '판매자' : '구매자' }}</p>
              </div>
            </div>
            <div v-if="editSuccess" class="mt-3 text-sm text-green-600 dark:text-green-400">{{ editSuccess }}</div>
          </template>

          <!-- 수정 모드 -->
          <template v-else>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">이름</label>
                <input v-model="editName" type="text"
                  class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">전화번호</label>
                <input v-model="editPhone" type="tel"
                  class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
              </div>
              <div v-if="editError" class="text-sm text-red-500">{{ editError }}</div>
              <div class="flex gap-3">
                <button @click="cancelEdit"
                  class="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  취소
                </button>
                <button @click="saveUserInfo"
                  class="flex-1 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
                  저장
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- 예치금 잔액 -->
        <div v-if="userInfo" class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          <div class="flex items-center justify-between">
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

        <!-- 셀러 상품 관리 링크 -->
        <div v-if="auth.isSeller" class="mt-4">
          <RouterLink to="/seller/products"
            class="flex items-center justify-between w-full bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
            <div>
              <p class="font-bold text-gray-800 dark:text-gray-100">내 상품 관리</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">등록한 상품을 수정하거나 삭제할 수 있습니다</p>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </RouterLink>
        </div>

        <div v-if="auth.isSeller" class="mt-4">
          <RouterLink to="/seller/settlements"
            class="flex items-center justify-between w-full bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
            <div>
              <p class="font-bold text-gray-800 dark:text-gray-100">정산 확인</p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">월별 정산 금액과 계산 상세를 확인할 수 있습니다</p>
            </div>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </RouterLink>
        </div>
      </div>

      <!-- ============ 주문 내역 탭 ============ -->
      <div v-else-if="activeTab === 'orders'">
        <div class="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 class="text-lg font-bold">주문 내역</h2>
          <div class="flex gap-2">
            <select v-model="orderFilter"
              class="px-3 py-2 bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 rounded-lg text-sm"
              @change="fetchOrders">
              <option value="ALL">전체 상태</option>
              <option value="PENDING">결제 처리 중</option>
              <option value="PAID">결제 완료</option>
              <option value="FAILED">결제 실패</option>
              <option value="REFUNDED">환불 완료</option>
              <option value="EXPIRED">주문 만료</option>
            </select>
            <button @click="fetchOrders"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              새로고침
            </button>
          </div>
        </div>

        <div v-if="ordersError" class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">{{ ordersError }}</div>

        <div v-else-if="ordersLoading"
          class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center text-gray-400 dark:text-gray-500 text-sm">
          주문 내역을 불러오는 중입니다.
        </div>

        <div v-else-if="orders.length === 0"
          class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center text-gray-400 dark:text-gray-500 text-sm">
          주문 내역이 없습니다.
        </div>

        <div v-else class="space-y-3">
          <div v-for="order in orders" :key="order.id"
            class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-wrap gap-4 items-start">

            <div class="flex-1 min-w-0 space-y-1">
              <p class="font-bold text-base text-gray-800 dark:text-gray-100">주문 {{ order.id }}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500 break-all">주문 번호: {{ order.id }}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500 break-all">일정 ID: {{ order.productScheduleId }}</p>
              <p class="text-xs text-gray-400 dark:text-gray-500">수량: {{ order.quantity }}명 | ₩{{ formatPrice(order.totalAmount) }}</p>
              <span :class="orderStatus(order.status).cls" class="inline-block px-2 py-1 border rounded text-xs">
                {{ orderStatus(order.status).label }}
              </span>
              <div v-if="order.status === 'REFUNDED' && refundInfoOf(order.id)"
                class="mt-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 px-3 py-3 text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
                <p>클래스 시작 날짜: <strong class="text-gray-800 dark:text-gray-100">{{ formatDateOnly(refundInfoOf(order.id).classStartDate) }}</strong></p>
                <p>환불 날짜: <strong class="text-gray-800 dark:text-gray-100">{{ formatDate(refundInfoOf(order.id).refundProcessedAt) }}</strong></p>
                <p>환불 비율: <strong class="text-blue-700 dark:text-blue-300">{{ formatRefundRate(refundInfoOf(order.id).refundRate) }}</strong></p>
              </div>
              <div v-else-if="order.status === 'REFUNDED' && hasRefundInfoError(order.id)"
                class="mt-3 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-3 text-xs text-amber-700 dark:text-amber-300">
                상세 계산 정보는 아직 표시되지 않을 수 있습니다.
              </div>
            </div>

            <div class="flex flex-col gap-2 shrink-0">
              <button @click="loadOrderDetail(order.id)"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-xs text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                {{ selectedOrderId === order.id && selectedOrder?.id === order.id && !selectedOrderLoading ? '상세 닫기' : '상세 조회' }}
              </button>
              <button v-if="order.status === 'PAID'" @click="refund(order.id)"
                :disabled="orderActionLoadingId === order.id"
                class="px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs transition-colors">
                {{ orderActionLoadingId === order.id ? '환불 처리 중...' : '환불' }}
              </button>
            </div>
            
            <div v-if="selectedOrderId === order.id" class="basis-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#181818] p-5">
              <div v-if="selectedOrderLoading" class="text-sm text-gray-400 dark:text-gray-500">
                주문 상세를 불러오는 중입니다.
              </div>

              <div v-else-if="selectedOrder" class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">주문 번호</p>
                  <p class="font-medium break-all">{{ selectedOrder.id }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">주문 상태</p>
                  <span :class="orderStatus(selectedOrder.status).cls" class="inline-block px-2 py-1 border rounded text-xs">
                    {{ orderStatus(selectedOrder.status).label }}
                  </span>
                </div>
                <div>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">일정 ID</p>
                  <p class="font-medium break-all">{{ selectedOrder.productScheduleId }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">구매자 ID</p>
                  <p class="font-medium break-all">{{ selectedOrder.buyerId }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">예약 인원</p>
                  <p class="font-medium">{{ selectedOrder.quantity }}명</p>
                </div>
                <div>
                  <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">총 주문 금액</p>
                  <p class="font-medium">₩{{ formatPrice(selectedOrder.totalAmount) }}</p>
                </div>
                <template v-if="selectedOrder.status === 'REFUNDED' && refundInfoOf(selectedOrder.id)">
                  <div>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">클래스 시작 날짜</p>
                    <p class="font-medium">{{ formatDateOnly(refundInfoOf(selectedOrder.id).classStartDate) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">환불 날짜</p>
                    <p class="font-medium">{{ formatDate(refundInfoOf(selectedOrder.id).refundProcessedAt) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">환불 비율</p>
                    <p class="font-medium text-blue-600 dark:text-blue-400">{{ formatRefundRate(refundInfoOf(selectedOrder.id).refundRate) }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mb-1">총 환불 금액</p>
                    <p class="font-medium">₩{{ formatPrice(refundInfoOf(selectedOrder.id).totalRefundAmount) }}</p>
                  </div>
                </template>
                <div v-else-if="selectedOrder.status === 'REFUNDED' && hasRefundInfoError(selectedOrder.id)"
                  class="sm:col-span-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
                  상세 계산 정보는 아직 표시되지 않을 수 있습니다.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ 예치금 내역 탭 ============ -->
      <div v-else-if="activeTab === 'deposits'">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold">예치금 내역</h2>
          <RouterLink to="/deposit/charge"
            class="text-sm px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
            충전하기
          </RouterLink>
        </div>

        <div v-if="depositError" class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">{{ depositError }}</div>

        <div v-else-if="depositHistories.length === 0"
          class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center text-gray-400 dark:text-gray-500 text-sm">
          예치금 내역이 없습니다.
        </div>

        <div v-else class="space-y-2">
          <div v-for="item in depositHistories" :key="item.depositHistoryId ?? item.id"
            class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
            <div class="flex flex-col gap-1">
              <span v-if="item.type === 'CHARGE'" class="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
                충전
              </span>
              <span v-else-if="item.type === 'PAYMENT'" class="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" /></svg>
                사용
              </span>
              <span v-else-if="item.type === 'REFUND'" class="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                환불
              </span>
              <span v-else class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ item.type }}</span>
              <span v-if="item.createdAt" class="text-xs text-gray-400 dark:text-gray-600">{{ formatDate(item.createdAt) }}</span>
              <div v-if="item.type === 'REFUND' && refundInfoOf(item.paymentId)"
                class="mt-2 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 px-3 py-3 text-xs text-gray-600 dark:text-gray-300 space-y-1.5">
                <p>클래스 시작 날짜: <strong class="text-gray-800 dark:text-gray-100">{{ formatDateOnly(refundInfoOf(item.paymentId).classStartDate) }}</strong></p>
                <p>환불 날짜: <strong class="text-gray-800 dark:text-gray-100">{{ formatDate(refundInfoOf(item.paymentId).refundProcessedAt) }}</strong></p>
                <p>환불 비율: <strong class="text-blue-700 dark:text-blue-300">{{ formatRefundRate(refundInfoOf(item.paymentId).refundRate) }}</strong></p>
              </div>
              <div v-else-if="item.type === 'REFUND' && hasRefundInfoError(item.paymentId)"
                class="mt-2 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-3 text-xs text-amber-700 dark:text-amber-300">
                상세 계산 정보는 아직 표시되지 않을 수 있습니다.
              </div>
            </div>
            <span :class="{
              'text-green-600 dark:text-green-400': item.type === 'CHARGE' || item.type === 'REFUND',
              'text-red-600 dark:text-red-400': item.type === 'PAYMENT',
              'text-gray-700 dark:text-gray-300': !['CHARGE','PAYMENT','REFUND'].includes(item.type),
            }" class="text-base font-bold">
              {{ item.type === 'PAYMENT' ? '-' : '+' }}₩{{ formatPrice(item.amount) }}
            </span>
          </div>
        </div>
      </div>

      <!-- ============ 내 리뷰 탭 ============ -->
      <div v-else-if="activeTab === 'reviews'">
        <h2 class="text-lg font-bold mb-4">내 리뷰</h2>

        <div v-if="reviewsError" class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">{{ reviewsError }}</div>

        <div v-else-if="myReviews.length === 0"
          class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center text-gray-400 dark:text-gray-500 text-sm">
          작성한 리뷰가 없습니다.
        </div>

        <div v-else class="space-y-4">
          <div v-for="review in myReviews" :key="review.id"
            class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div class="flex items-start justify-between mb-2">
              <div>
                <p v-if="review.productTitle" class="font-bold text-sm text-gray-800 dark:text-gray-100 mb-1">{{ review.productTitle }}</p>
                <div class="flex gap-0.5">
                  <svg v-for="n in 5" :key="n" class="w-4 h-4"
                    :class="n <= review.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'"
                    fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <span class="text-xs text-gray-400 dark:text-gray-500">{{ formatDate(review.createdAt) }}</span>
              </div>
              <RouterLink v-if="review.productId" :to="`/products/${review.productId}`"
                class="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg transition-colors">
                상품 보기
              </RouterLink>
            </div>
            <p class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{{ review.content }}</p>
          </div>
        </div>
      </div>

      <!-- ============ 찜 목록 탭 ============ -->
      <div v-else-if="activeTab === 'likes'">
        <h2 class="text-lg font-bold mb-4">찜 목록</h2>

        <div v-if="likesError" class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">{{ likesError }}</div>

        <div v-else-if="myLikes.length === 0"
          class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center text-gray-400 dark:text-gray-500 text-sm">
          찜한 일정이 없습니다.
        </div>

        <div v-else class="space-y-3">
          <div v-for="like in myLikes" :key="like.id"
            class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex items-center gap-4">

            <div class="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 flex items-center justify-center">
              <img v-if="like.thumbnailPath" :src="like.thumbnailPath" alt="상품 이미지" class="w-full h-full object-cover" />
              <svg v-else class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <div class="flex-1 min-w-0">
              <p class="font-bold text-gray-800 dark:text-gray-100 text-sm">{{ like.productTitle || '상품 정보 없음' }}</p>
              <p v-if="like.scheduleDt" class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {{ like.scheduleDt }}
                <template v-if="like.startTime"> {{ like.startTime }}~{{ like.endTime }}</template>
              </p>
            </div>

            <div class="flex gap-2 shrink-0">
              <RouterLink v-if="like.productId" :to="`/products/${like.productId}`"
                class="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                상품 보기
              </RouterLink>
              <button @click="removeLike(like.productScheduleId, like.id)"
                class="p-2 text-red-400 hover:text-red-600 border border-red-200 dark:border-red-800 hover:border-red-400 rounded-lg transition-colors">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
