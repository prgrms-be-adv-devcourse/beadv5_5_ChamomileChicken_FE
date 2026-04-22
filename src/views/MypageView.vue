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
import { resolveImageUrl } from '@/utils/imageUrl'

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

const userInfo = ref(null)
const editMode = ref(false)
const editName = ref('')
const editPhone = ref('')
const editError = ref('')
const editSuccess = ref('')

const depositHistories = ref([])
const depositError = ref('')

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

const myReviews = ref([])
const reviewsLoaded = ref(false)
const reviewsError = ref('')

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
      depositHistories.value.filter((item) => item.type === 'REFUND' && item.paymentId).map((item) => item.paymentId),
    )
  } catch { depositError.value = '예치금 내역을 불러오지 못했습니다.' }
  await fetchOrders()
})

async function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'reviews' && !reviewsLoaded.value) {
    reviewsLoaded.value = true
    try { const res = await productsApi.myReviews(); myReviews.value = extractApiData(res) ?? [] }
    catch { reviewsError.value = '리뷰 내역을 불러오지 못했습니다.' }
  }
  if (tab === 'likes' && !likesLoaded.value) {
    likesLoaded.value = true
    try { const res = await productsApi.myLikes(); myLikes.value = extractApiData(res) ?? [] }
    catch { likesError.value = '찜 목록을 불러오지 못했습니다.' }
  }
}

async function fetchOrders() {
  ordersLoading.value = true
  ordersError.value = ''
  try {
    const res = await ordersApi.list(orderFilter.value)
    const data = extractApiData(res) ?? []
    orders.value = Array.isArray(data) ? data : []
    await loadRefundInfos(orders.value.filter((order) => order.status === 'REFUNDED').map((order) => order.id))
    if (selectedOrder.value) {
      const refreshed = orders.value.find((order) => order.id === selectedOrder.value.id)
      if (refreshed) selectedOrder.value = { ...selectedOrder.value, ...refreshed }
    }
  } catch { ordersError.value = '주문 내역을 불러오지 못했습니다.' }
  finally { ordersLoading.value = false }
}

async function loadOrderDetail(orderId) {
  if (selectedOrderId.value === orderId && selectedOrder.value?.id === orderId && !selectedOrderLoading.value) {
    selectedOrderId.value = null; selectedOrder.value = null; return
  }
  selectedOrderId.value = orderId
  selectedOrderLoading.value = true
  ordersError.value = ''
  try {
    const res = await ordersApi.detail(orderId)
    selectedOrder.value = extractApiData(res)
    if (selectedOrder.value?.status === 'REFUNDED') await loadRefundInfos([orderId])
  } catch (e) { ordersError.value = extractApiMessage(e, '주문 상세를 불러오지 못했습니다.'); selectedOrderId.value = null }
  finally { selectedOrderLoading.value = false }
}

function startEdit() { editName.value = userInfo.value?.name ?? ''; editPhone.value = userInfo.value?.phone ?? ''; editError.value = ''; editSuccess.value = ''; editMode.value = true }
function cancelEdit() { editMode.value = false }

async function saveUserInfo() {
  editError.value = ''; editSuccess.value = ''
  if (!editName.value.trim() || !editPhone.value.trim()) { editError.value = '이름과 전화번호를 모두 입력해주세요.'; return }
  try {
    await usersApi.updateMe(editName.value, editPhone.value)
    await auth.fetchUser()
    userInfo.value = auth.user
    editMode.value = false
    editSuccess.value = '정보가 수정되었습니다.'
  } catch (e) { editError.value = e.response?.data?.message || '정보 수정에 실패했습니다.' }
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
    await Promise.all([fetchOrders(), auth.fetchUser()])
    userInfo.value = auth.user
    if (selectedOrder.value?.id === orderId) await loadOrderDetail(orderId)
  } catch (e) { alert(extractApiMessage(e, '환불 처리에 실패했습니다.')) }
  finally { orderActionLoadingId.value = null }
}

async function loadRefundInfos(orderIds) {
  const uniqueIds = [...new Set((orderIds ?? []).filter(Boolean))].filter((orderId) => !refundInfos.value[orderId])
  if (uniqueIds.length === 0) return
  const entries = await Promise.all(
    uniqueIds.map(async (orderId) => {
      try { const res = await ordersApi.getRefundInfo(orderId); return { orderId, data: extractApiData(res), error: false } }
      catch { return { orderId, data: null, error: true } }
    }),
  )
  refundInfos.value = { ...refundInfos.value, ...Object.fromEntries(entries.filter((e) => e.data).map((e) => [e.orderId, e.data])) }
  refundInfoErrors.value = { ...refundInfoErrors.value, ...Object.fromEntries(entries.filter((e) => e.error).map((e) => [e.orderId, true])) }
}

async function removeLike(scheduleId, likeId) {
  try { await productsApi.deleteLike(scheduleId, likeId); myLikes.value = myLikes.value.filter(l => l.id !== likeId) }
  catch (e) { alert(e.response?.data?.message || '찜 삭제에 실패했습니다.') }
}

const ORDER_STATUS = {
  PENDING:  { label: '결제 처리 중', badge: 'badge-warning' },
  PAID:     { label: '결제 완료',    badge: 'badge-success' },
  FAILED:   { label: '결제 실패',    badge: 'badge-error' },
  EXPIRED:  { label: '주문 만료',    badge: 'badge-ghost' },
  REFUNDED: { label: '환불 완료',    badge: 'badge-info' },
}

function orderStatus(status) { return ORDER_STATUS[status] ?? { label: status, badge: 'badge-ghost' } }
function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }
function formatDate(dt) { return dt ? dt.substring(0, 16).replace('T', ' ') : '' }
function formatDateOnly(dt) { return dt ? String(dt).substring(0, 10) : '' }
function formatRefundRate(rate) { return `${Math.round(Number(rate ?? 0) * 100)}%` }
function refundInfoOf(orderId) { return orderId ? refundInfos.value[orderId] ?? null : null }
function hasRefundInfoError(orderId) { return Boolean(orderId && refundInfoErrors.value[orderId]) }
</script>

<template>
  <div class="bg-base-200 min-h-screen pb-20">
    <!-- Navbar -->
    <div class="navbar bg-base-100/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-10 border-b border-base-300/50">
      <div class="flex-1">
        <RouterLink to="/products" class="hover:opacity-80 transition-opacity">
          <img src="/logo.svg" class="h-12 lg:h-14" alt="Jaba 클래스" />
        </RouterLink>
      </div>
      <div class="flex-none flex items-center gap-4">
        <ThemeToggle />
        <button @click="logout" class="btn btn-ghost btn-sm rounded-full font-bold text-error/70">로그아웃</button>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 py-10">
      
      <!-- User Profile Summary -->
      <div v-if="userInfo" class="flex flex-col md:flex-row items-center gap-8 mb-12 px-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div class="w-24 h-24 lg:w-32 lg:h-32 rounded-[40px] bg-primary/10 flex items-center justify-center text-4xl lg:text-5xl font-black text-primary shadow-inner">
          {{ userInfo.name?.charAt(0) }}
        </div>
        <div class="text-center md:text-left flex-1">
          <h1 class="text-3xl lg:text-4xl font-black text-base-content mb-2">{{ userInfo.name }}님, 안녕하세요!</h1>
          <p class="text-base-content/40 font-bold text-lg">{{ userInfo.email }}</p>
          <div class="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
            <span class="badge bg-base-300/50 border-none font-black text-xs py-3 px-4 rounded-xl">{{ userInfo.role === 'SELLER' ? '🏢 판매자' : '👤 수강생' }}</span>
            <span v-if="auth.isSeller" class="badge bg-primary/10 text-primary border-none font-black text-xs py-3 px-4 rounded-xl">Premium Partner</span>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div v-if="userInfo" class="grid grid-cols-1 gap-4 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100" :class="{ 'md:grid-cols-2': auth.isSeller }">
        <div class="card bg-base-100 rounded-[32px] p-8 shadow-sm border border-base-300/20 group hover:shadow-md transition-all">
          <p class="text-sm font-black text-base-content/40 mb-2 uppercase tracking-widest">My Deposit</p>
          <div class="flex items-baseline justify-between">
            <h3 class="text-4xl font-black text-primary tracking-tighter">₩{{ formatPrice(userInfo.deposit) }}</h3>
            <RouterLink to="/deposit/charge" class="btn btn-primary rounded-2xl px-6 shadow-lg shadow-primary/20">충전</RouterLink>
          </div>
        </div>
        <div v-if="auth.isSeller" class="card bg-base-100 text-base-content rounded-[32px] p-8 shadow-sm group hover:shadow-xl transition-all">
          <p class="text-sm font-black opacity-40 mb-2 uppercase tracking-widest">Seller Management</p>
          <div class="flex items-center justify-between">
            <h3 class="text-2xl font-black tracking-tight">판매자 메뉴</h3>
            <div class="flex gap-2">
              <RouterLink to="/seller/products" class="btn btn-sm bg-base-content/10 hover:bg-base-content/20 border-none text-base-content rounded-xl">상품</RouterLink>
              <RouterLink to="/seller/settlements" class="btn btn-sm bg-base-content/10 hover:bg-base-content/20 border-none text-base-content rounded-xl">정산</RouterLink>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs tabs-boxed bg-base-100 mb-8 p-1.5 rounded-[24px] shadow-sm border border-base-300/20 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        <button v-for="tab in tabs" :key="tab.key"
          @click="switchTab(tab.key)"
          :class="activeTab === tab.key ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-base-content/50 hover:bg-base-200'"
          class="tab flex-1 h-12 rounded-[18px] font-black text-sm transition-all duration-300">
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Contents -->
      <div class="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
        <!-- ===== 내 정보 탭 ===== -->
        <div v-if="activeTab === 'info'">
          <div v-if="userInfo" class="card bg-base-100 rounded-[32px] shadow-sm border border-base-300/20 overflow-hidden">
            <div class="card-body p-8 lg:p-10">
              <div class="flex items-center justify-between mb-8">
                <h2 class="text-2xl font-black">계정 설정</h2>
                <button v-if="!editMode" @click="startEdit" class="btn btn-ghost bg-base-200 rounded-xl px-6 font-black">수정</button>
              </div>

              <template v-if="!editMode">
                <div class="space-y-6">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-base-300/30">
                    <span class="text-base font-bold text-base-content/40">이름</span>
                    <span class="text-lg font-black">{{ userInfo.name }}</span>
                  </div>
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-base-300/30">
                    <span class="text-base font-bold text-base-content/40">이메일</span>
                    <span class="text-lg font-black">{{ userInfo.email }}</span>
                  </div>
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-base-300/30">
                    <span class="text-base font-bold text-base-content/40">전화번호</span>
                    <span class="text-lg font-black">{{ userInfo.phone }}</span>
                  </div>
                </div>
                <transition name="fade">
                  <div v-if="editSuccess" class="alert bg-success/10 border-none text-success py-4 mt-6 rounded-2xl font-black">{{ editSuccess }}</div>
                </transition>
              </template>

              <template v-else>
                <div class="space-y-6">
                  <div class="form-control">
                    <label class="label pt-0"><span class="label-text text-xs font-black text-base-content/40">이름</span></label>
                    <input v-model="editName" type="text" class="input input-lg bg-base-200 border-none rounded-2xl font-black focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all h-14" />
                  </div>
                  <div class="form-control">
                    <label class="label pt-0"><span class="label-text text-xs font-black text-base-content/40">전화번호</span></label>
                    <input v-model="editPhone" type="tel" class="input input-lg bg-base-200 border-none rounded-2xl font-black focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all h-14" />
                  </div>
                  <div v-if="editError" class="text-error font-black text-sm">{{ editError }}</div>
                  <div class="flex gap-4 mt-4">
                    <button @click="cancelEdit" class="btn btn-ghost btn-lg flex-1 rounded-2xl font-black">취소</button>
                    <button @click="saveUserInfo" class="btn btn-primary btn-lg flex-1 rounded-2xl font-black shadow-xl shadow-primary/20">저장하기</button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- ===== 주문 내역 탭 ===== -->
        <div v-else-if="activeTab === 'orders'">
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
            <h2 class="text-2xl font-black">주문 내역</h2>
            <div class="flex gap-2 w-full sm:w-auto">
              <select v-model="orderFilter" class="select bg-base-100 rounded-xl border-base-300/50 flex-1 sm:w-32" @change="fetchOrders">
                <option value="ALL">전체</option>
                <option value="PAID">결제완료</option>
                <option value="REFUNDED">환불</option>
                <option value="PENDING">대기</option>
              </select>
              <button @click="fetchOrders" class="btn btn-ghost bg-base-100 rounded-xl border-base-300/50">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
            </div>
          </div>

          <div v-if="ordersError" class="alert bg-error/10 border-none text-error py-4 rounded-2xl mb-6 font-black">{{ ordersError }}</div>
          <div v-else-if="ordersLoading" class="flex justify-center py-20"><span class="loading loading-spinner loading-lg text-primary"></span></div>
          <div v-else-if="orders.length === 0" class="card bg-base-100 rounded-[32px] p-20 border border-base-300/20 text-center">
            <p class="text-5xl mb-4">📦</p>
            <p class="font-black text-base-content/30 text-lg">주문 내역이 아직 없네요.</p>
          </div>

          <div v-else class="space-y-4">
            <div v-for="order in orders" :key="order.id" class="card bg-base-100 rounded-[32px] border border-base-300/20 hover:shadow-md transition-all overflow-hidden">
              <div class="card-body p-6 lg:p-8">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                      <span :class="orderStatus(order.status).badge" class="badge border-none font-black text-[10px] py-2.5 px-3">
                        {{ orderStatus(order.status).label }}
                      </span>
                      <span class="text-xs font-black text-base-content/30 uppercase tracking-tighter">ID: {{ order.id?.toString().substring(0, 12) }}</span>
                    </div>
                    <h4 class="text-lg font-black mb-1">클래스 예약 (일정 #{{ order.productScheduleId }})</h4>
                    <p class="text-base-content/40 font-bold text-sm">수량 {{ order.quantity }}개 · 결제금액 ₩{{ formatPrice(order.totalAmount) }}</p>
                    
                    <transition name="fade">
                      <div v-if="order.status === 'REFUNDED' && refundInfoOf(order.id)" class="mt-4 p-4 rounded-2xl bg-info/5 border border-info/10 text-xs">
                        <div class="grid grid-cols-2 gap-2">
                          <div><p class="text-info/50 font-black">시작일</p><p class="font-black">{{ formatDateOnly(refundInfoOf(order.id).classStartDate) }}</p></div>
                          <div><p class="text-info/50 font-black">환불일</p><p class="font-black">{{ formatDate(refundInfoOf(order.id).refundProcessedAt) }}</p></div>
                          <div><p class="text-info/50 font-black">환불비율</p><p class="text-lg font-black text-info">{{ formatRefundRate(refundInfoOf(order.id).refundRate) }}</p></div>
                        </div>
                      </div>
                    </transition>
                  </div>
                  
                  <div class="flex gap-2 shrink-0">
                    <button @click="loadOrderDetail(order.id)" class="btn btn-ghost bg-base-200 rounded-xl px-4 font-black text-xs">
                      {{ selectedOrderId === order.id ? '상세닫기' : '상세보기' }}
                    </button>
                    <button v-if="order.status === 'PAID'" @click="refund(order.id)" :disabled="orderActionLoadingId === order.id" class="btn btn-error rounded-xl px-6 font-black text-xs shadow-lg shadow-error/20">
                      {{ orderActionLoadingId === order.id ? '처리중' : '환불신청' }}
                    </button>
                  </div>
                </div>

                <transition name="slide-up">
                  <div v-if="selectedOrderId === order.id" class="mt-6 pt-6 border-t border-base-300/30">
                    <div v-if="selectedOrderLoading" class="flex justify-center py-4"><span class="loading loading-spinner text-primary"></span></div>
                    <div v-else-if="selectedOrder" class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-base-200/50 p-6 rounded-2xl">
                      <div><p class="text-xs font-black text-base-content/30 mb-1">풀 주문번호</p><p class="text-sm font-black break-all">{{ selectedOrder.id }}</p></div>
                      <div><p class="text-xs font-black text-base-content/30 mb-1">총 결제금액</p><p class="text-sm font-black text-primary">₩{{ formatPrice(selectedOrder.totalAmount) }}</p></div>
                      <template v-if="selectedOrder.status === 'REFUNDED' && refundInfoOf(selectedOrder.id)">
                        <div><p class="text-xs font-black text-base-content/30 mb-1">최종 환불액</p><p class="text-sm font-black text-info">₩{{ formatPrice(refundInfoOf(selectedOrder.id).totalRefundAmount) }}</p></div>
                      </template>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== 예치금 내역 탭 ===== -->
        <div v-else-if="activeTab === 'deposits'">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-2xl font-black">예치금 내역</h2>
            <RouterLink to="/deposit/charge" class="btn btn-primary rounded-2xl px-8 shadow-lg shadow-primary/20">충전하기</RouterLink>
          </div>

          <div v-if="depositError" class="alert bg-error/10 border-none text-error py-4 rounded-2xl mb-6 font-black">{{ depositError }}</div>
          <div v-else-if="depositHistories.length === 0" class="card bg-base-100 rounded-[32px] p-20 border border-base-300/20 text-center">
            <p class="text-5xl mb-4">💰</p>
            <p class="font-black text-base-content/30 text-lg">사용 내역이 아직 없네요.</p>
          </div>

          <div v-else class="bg-base-100 rounded-[32px] border border-base-300/20 shadow-sm overflow-hidden">
            <div v-for="(item, idx) in depositHistories" :key="item.depositHistoryId ?? item.id" 
              class="flex items-center justify-between p-6 hover:bg-base-200/50 transition-colors border-base-300/20"
              :class="{ 'border-b': idx !== depositHistories.length - 1 }">
              <div class="flex items-center gap-5">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner"
                  :class="{
                    'bg-success/10 text-success': item.type === 'CHARGE' || item.type === 'REFUND',
                    'bg-error/10 text-error': item.type === 'PAYMENT',
                    'bg-base-200 text-base-content/40': item.type !== 'CHARGE' && item.type !== 'REFUND' && item.type !== 'PAYMENT'
                  }">
                  {{ item.type === 'CHARGE' ? '📥' : (item.type === 'PAYMENT' ? '📤' : '🔙') }}
                </div>
                <div>
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-base font-black">{{ item.type === 'CHARGE' ? '충전' : (item.type === 'PAYMENT' ? '사용' : (item.type === 'REFUND' ? '환불' : item.type)) }}</span>
                    <span v-if="item.createdAt" class="text-[10px] font-black text-base-content/30">{{ formatDate(item.createdAt) }}</span>
                  </div>
                  <p class="text-xs font-bold text-base-content/40">예치금 잔액 변동</p>
                </div>
              </div>
              <span class="text-lg font-black tracking-tight"
                :class="{
                  'text-success': item.type === 'CHARGE' || item.type === 'REFUND',
                  'text-error': item.type === 'PAYMENT',
                }">
                {{ item.type === 'PAYMENT' ? '-' : '+' }}₩{{ formatPrice(item.amount) }}
              </span>
            </div>
          </div>
        </div>

        <!-- ===== 내 리뷰 탭 ===== -->
        <div v-else-if="activeTab === 'reviews'">
          <h2 class="text-2xl font-black mb-8">내 리뷰</h2>
          <div v-if="reviewsError" class="alert bg-error/10 border-none text-error py-4 rounded-2xl mb-6 font-black">{{ reviewsError }}</div>
          <div v-else-if="myReviews.length === 0" class="card bg-base-100 rounded-[32px] p-20 border border-base-300/20 text-center">
            <p class="text-5xl mb-4">✍️</p>
            <p class="font-black text-base-content/30 text-lg">아직 작성한 리뷰가 없어요.</p>
          </div>
          <div v-else class="space-y-4">
            <div v-for="review in myReviews" :key="review.id" class="card bg-base-100 rounded-[32px] border border-base-300/20 p-8 shadow-sm group hover:shadow-md transition-all">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <h4 v-if="review.productTitle" class="text-lg font-black mb-2 group-hover:text-primary transition-colors">{{ review.productTitle }}</h4>
                  <div class="flex gap-0.5 mb-1">
                    <svg v-for="n in 5" :key="n" class="w-4 h-4" :class="n <= review.rating ? 'text-warning' : 'text-base-300'" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <span class="text-[10px] font-black text-base-content/30 tracking-widest">{{ formatDate(review.createdAt) }}</span>
                </div>
                <RouterLink v-if="review.productId" :to="`/products/${review.productId}`" class="btn btn-ghost bg-base-200 rounded-xl px-4 text-xs font-black">상품보기</RouterLink>
              </div>
              <p class="text-base-content/70 font-medium leading-relaxed bg-base-200/50 p-6 rounded-2xl">{{ review.content }}</p>
            </div>
          </div>
        </div>

        <!-- ===== 찜 목록 탭 ===== -->
        <div v-else-if="activeTab === 'likes'">
          <h2 class="text-2xl font-black mb-8">찜한 클래스</h2>
          <div v-if="likesError" class="alert bg-error/10 border-none text-error py-4 rounded-2xl mb-6 font-black">{{ likesError }}</div>
          <div v-else-if="myLikes.length === 0" class="card bg-base-100 rounded-[32px] p-20 border border-base-300/20 text-center">
            <p class="text-5xl mb-4">❤️</p>
            <p class="font-black text-base-content/30 text-lg">찜한 클래스가 없어요.</p>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="like in myLikes" :key="like.id" class="card bg-base-100 rounded-[32px] border border-base-300/20 overflow-hidden group hover:shadow-xl transition-all">
              <div class="flex items-center p-6 gap-6">
                <div class="w-20 h-20 rounded-2xl overflow-hidden bg-base-200 shrink-0 relative">
                  <img v-if="like.thumbnailPath" :src="resolveImageUrl(like.thumbnailPath)" alt="상품 이미지" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div v-else class="w-full h-full flex items-center justify-center text-3xl opacity-20">🎨</div>
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-black text-lg mb-1 truncate">{{ like.productTitle || '상품 정보 없음' }}</h4>
                  <p v-if="like.scheduleDt" class="text-xs font-bold text-base-content/40 mb-3">
                    📅 {{ like.scheduleDt }} {{ like.startTime }}~{{ like.endTime }}
                  </p>
                  <div class="flex gap-2">
                    <RouterLink v-if="like.productId" :to="`/products/${like.productId}`" class="btn btn-primary btn-xs rounded-lg px-4 font-black">보기</RouterLink>
                    <button @click="removeLike(like.productScheduleId, like.id)" class="btn btn-error btn-xs btn-circle rounded-lg text-white">
                      <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active { transition: opacity 0.5s ease-out; }
.fade-enter-from { opacity: 0; }

.slide-up-enter-active { transition: all 0.5s ease-out; }
.slide-up-enter-from { opacity: 0; transform: translateY(20px); }
</style>
