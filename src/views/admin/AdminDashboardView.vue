<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '@/api/admin'
import { productsApi } from '@/api/products'
import ThemeToggle from '@/components/ThemeToggle.vue'

const activeTab = ref('users')
const users = ref([])
const products = ref([])
const orders = ref([])
const settlements = ref([])
const loading = ref(false)
const sidebarOpen = ref(true)

// 필터 상태
const userFilter = ref({ role: '', name: '', email: '' })
const productFilter = ref({ status: '', sellerEmail: '', title: '' })
const orderFilter = ref({ status: '', sellerEmail: '', startDate: '', endDate: '' })
const settlementFilter = ref({ status: '', sellerEmail: '', settlementMonth: '' })

function cleanParams(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null))
}

function resetUserFilter() { Object.assign(userFilter.value, { role: '', name: '', email: '' }) }
function resetProductFilter() { Object.assign(productFilter.value, { status: '', sellerEmail: '', title: '' }) }
function resetOrderFilter() { Object.assign(orderFilter.value, { status: '', sellerEmail: '', startDate: '', endDate: '' }) }
function resetSettlementFilter() { Object.assign(settlementFilter.value, { status: '', sellerEmail: '', settlementMonth: '' }) }

async function resolveSellerIdByEmail(email) {
  if (!email) return undefined
  try {
    const res = await adminApi.getUsers({ email })
    return (res.data?.data?.content ?? [])[0]?.id ?? undefined
  } catch {
    return undefined
  }
}

const userCache = ref({})

async function resolveUsers(ids) {
  const targets = [...new Set(ids.filter(Boolean))].filter(id => !userCache.value[id])
  await Promise.allSettled(
    targets.map(async id => {
      try {
        const res = await adminApi.getUserDetail(id)
        const { name, email } = res.data?.data ?? {}
        if (name || email) userCache.value[id] = { name, email }
      } catch { /* 조회 실패 시 ID만 표시 */ }
    })
  )
}

function displayUserName(id) {
  if (!id) return '-'
  const entry = userCache.value[id]
  const shortId = String(id).substring(0, 8)
  return entry?.name ?? shortId
}

function displayUserEmail(id) {
  if (!id) return ''
  return userCache.value[id]?.email ?? ''
}

async function fetchData() {
  loading.value = true
  try {
    if (activeTab.value === 'users') {
      const res = await adminApi.getUsers(cleanParams(userFilter.value))
      users.value = res.data?.data?.content ?? []
    } else if (activeTab.value === 'products') {
      const { sellerEmail, ...rest } = productFilter.value
      const sellerId = await resolveSellerIdByEmail(sellerEmail)
      const res = await adminApi.getProducts(cleanParams({ ...rest, sellerId }))
      products.value = res.data?.data?.content ?? []
      await resolveUsers(products.value.map(p => p.sellerId))
    } else if (activeTab.value === 'orders') {
      const { sellerEmail, ...rest } = orderFilter.value
      const sellerId = await resolveSellerIdByEmail(sellerEmail)
      const res = await adminApi.getOrders(cleanParams({ ...rest, sellerId }))
      orders.value = res.data?.data?.content ?? []
      const orderUserIds = orders.value.flatMap(o => [o.userId, o.sellerId].filter(Boolean))
      await resolveUsers(orderUserIds)
    } else if (activeTab.value === 'settlements') {
      const { sellerEmail, ...rest } = settlementFilter.value
      const sellerId = await resolveSellerIdByEmail(sellerEmail)
      const res = await adminApi.getSettlements(cleanParams({ ...rest, sellerId }))
      settlements.value = res.data?.data?.content ?? []
      await resolveUsers(settlements.value.map(s => s.sellerId))
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

function switchTab(tab) {
  activeTab.value = tab
  fetchData()
}

async function approveSeller(userId) {
  if (!confirm('이 유저를 셀러로 승인하시겠습니까?')) return
  try {
    await adminApi.approveSeller(userId)
    alert('승인되었습니다.')
    fetchData()
  } catch (e) {
    alert(e.response?.data?.message || '승인 실패')
  }
}

async function forceDown(productId) {
  if (!confirm('이 상품을 강제로 내리시겠습니까?')) return
  try {
    await adminApi.forceDownProduct(productId)
    alert('처리되었습니다.')
    fetchData()
  } catch (e) {
    alert(e.response?.data?.message || '처리 실패')
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

const esMigrating = ref(false)
async function runEsMigrate() {
  if (!confirm('DB의 모든 상품을 Elasticsearch에 색인합니다. 계속하시겠습니까?')) return
  esMigrating.value = true
  try {
    const res = await productsApi.esMigrate()
    alert(`ES 색인 완료: ${res.data?.indexed ?? 0}개 상품이 색인되었습니다.`)
  } catch (e) {
    alert(e.response?.data?.message || 'ES 색인 실패')
  } finally {
    esMigrating.value = false
  }
}

const menus = [
  { key: 'users',       label: '사용자 정보',    icon: '👥' },
  { key: 'products',    label: '상품 관리',       icon: '📦' },
  { key: 'orders',      label: '전체 주문 조회',  icon: '🧾' },
  { key: 'settlements', label: '정산 내역 조회',  icon: '💰' },
]

const tabTitles = {
  users:       '사용자 정보',
  products:    '상품 관리',
  orders:      '전체 주문 조회',
  settlements: '정산 내역 조회',
}
</script>

<template>
  <div class="min-h-screen bg-base-200 flex">

    <!-- Sidebar -->
    <aside
      class="shrink-0 flex flex-col bg-base-100 border-r border-base-300/40 transition-all duration-300 shadow-sm"
      :class="sidebarOpen ? 'w-60' : 'w-16'"
    >
      <!-- Logo area -->
      <div class="flex items-center gap-3 px-4 py-5 border-b border-base-300/40 h-16">
        <RouterLink to="/products" class="shrink-0">
          <img src="/logo.svg" class="h-8" alt="Jaba 클래스" />
        </RouterLink>
        <span v-if="sidebarOpen" class="text-xs font-black text-base-content/30 uppercase tracking-widest whitespace-nowrap">Admin</span>
      </div>

      <!-- Menu items -->
      <nav class="flex-1 py-4 flex flex-col gap-1 px-2">
        <button
          v-for="menu in menus"
          :key="menu.keㄱy"
          @click="switchTab(menu.key)"
          class="flex items-center gap-3 px-3 py-3 rounded-2xl font-black text-sm transition-all duration-200 w-full text-left"
          :class="activeTab === menu.key
            ? 'bg-primary text-white shadow-lg shadow-primary/20'
            : 'text-base-content/50 hover:bg-base-200 hover:text-base-content'"
        >
          <span class="text-lg shrink-0">{{ menu.icon }}</span>
          <span v-if="sidebarOpen" class="whitespace-nowrap">{{ menu.label }}</span>
        </button>
      </nav>

      <!-- Bottom actions -->
      <div class="px-2 pb-4 flex flex-col gap-2 border-t border-base-300/40 pt-4">
        <button
          @click="runEsMigrate"
          :disabled="esMigrating"
          class="flex items-center gap-3 px-3 py-3 rounded-2xl font-black text-sm transition-all w-full text-left text-warning hover:bg-warning/10"
          :title="!sidebarOpen ? 'ES 색인' : ''"
        >
          <span class="text-lg shrink-0">⚡</span>
          <span v-if="sidebarOpen" class="whitespace-nowrap">
            {{ esMigrating ? 'ES 색인 중...' : 'ES 색인' }}
          </span>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0">

      <!-- Top bar -->
      <header class="h-16 bg-base-100/80 backdrop-blur-md border-b border-base-300/40 flex items-center px-6 gap-4 sticky top-0 z-20">
        <button @click="sidebarOpen = !sidebarOpen" class="btn btn-ghost btn-sm btn-circle">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 class="text-lg font-black text-base-content flex-1">{{ tabTitles[activeTab] }}</h1>
        <ThemeToggle />
        <RouterLink to="/products" class="btn btn-ghost btn-sm rounded-xl font-black text-base-content/40">메인으로</RouterLink>
      </header>

      <!-- Content area -->
      <main class="flex-1 p-6 overflow-auto">

        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-32">
          <span class="loading loading-spinner loading-lg text-primary"></span>
        </div>

        <template v-else>

          <!-- Users -->
          <div v-if="activeTab === 'users'" class="card bg-base-100 rounded-[28px] shadow-sm border border-base-300/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <!-- 필터 -->
            <div class="p-4 border-b border-base-300/20 flex flex-wrap gap-3 items-end">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-black text-base-content/40 uppercase tracking-widest">역할</label>
                <select v-model="userFilter.role" class="select select-sm rounded-xl border-base-300/40 bg-base-200/50 font-semibold min-w-[110px]">
                  <option value="">전체</option>
                  <option value="USER">수강생</option>
                  <option value="SELLER">판매자</option>
                  <option value="ADMIN">관리자</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-black text-base-content/40 uppercase tracking-widest">이름</label>
                <input v-model="userFilter.name" type="text" placeholder="이름 검색" class="input input-sm rounded-xl border-base-300/40 bg-base-200/50 w-36" @keyup.enter="fetchData" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-black text-base-content/40 uppercase tracking-widest">이메일</label>
                <input v-model="userFilter.email" type="text" placeholder="이메일 검색" class="input input-sm rounded-xl border-base-300/40 bg-base-200/50 w-44" @keyup.enter="fetchData" />
              </div>
              <button @click="fetchData" class="btn btn-primary btn-sm rounded-xl font-black px-5">검색</button>
              <button @click="resetUserFilter(); fetchData()" class="btn btn-ghost btn-sm rounded-xl font-black text-base-content/40">초기화</button>
            </div>
            <div class="overflow-x-auto">
              <table class="table w-full">
                <thead>
                  <tr class="border-base-300/30">
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">ID</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">이름</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">이메일</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">역할</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">가입일</th>
                    <th class="text-right font-black text-xs text-base-content/40 uppercase tracking-widest">관리</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in users" :key="user.id" class="border-base-300/20 hover:bg-base-200/40 transition-colors">
                    <td class="font-mono text-xs text-base-content/40">{{ user.id?.substring(0, 8) }}</td>
                    <td class="font-black">{{ user.name }}</td>
                    <td class="text-base-content/60 text-sm">{{ user.email }}</td>
                    <td class="text-sm font-black">
                      {{ user.role === 'ADMIN' ? '관리자' : user.role === 'SELLER' ? '판매자' : '수강생' }}
                    </td>
                    <td class="text-sm text-base-content/40">{{ formatDate(user.createdAt) }}</td>
                    <td class="text-right">
                      <button
                        v-if="user.role === 'USER'"
                        @click="approveSeller(user.id)"
                        class="btn btn-primary btn-xs rounded-xl font-black shadow-sm shadow-primary/20"
                      >
                        판매자 승인
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Products -->
          <div v-else-if="activeTab === 'products'" class="card bg-base-100 rounded-[28px] shadow-sm border border-base-300/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <!-- 필터 -->
            <div class="p-4 border-b border-base-300/20 flex flex-wrap gap-3 items-end">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-black text-base-content/40 uppercase tracking-widest">상태</label>
                <select v-model="productFilter.status" class="select select-sm rounded-xl border-base-300/40 bg-base-200/50 font-semibold min-w-[110px]">
                  <option value="">전체</option>
                  <option value="ENABLE">활성</option>
                  <option value="DISABLE">비활성</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-black text-base-content/40 uppercase tracking-widest">판매자 이메일</label>
                <input v-model="productFilter.sellerEmail" type="text" placeholder="판매자 이메일" class="input input-sm rounded-xl border-base-300/40 bg-base-200/50 w-48" @keyup.enter="fetchData" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-black text-base-content/40 uppercase tracking-widest">상품명</label>
                <input v-model="productFilter.title" type="text" placeholder="상품명 검색" class="input input-sm rounded-xl border-base-300/40 bg-base-200/50 w-44" @keyup.enter="fetchData" />
              </div>
              <button @click="fetchData" class="btn btn-primary btn-sm rounded-xl font-black px-5">검색</button>
              <button @click="resetProductFilter(); fetchData()" class="btn btn-ghost btn-sm rounded-xl font-black text-base-content/40">초기화</button>
            </div>
            <div class="overflow-x-auto">
              <table class="table w-full">
                <thead>
                  <tr class="border-base-300/30">
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">ID</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">상품명</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">판매자</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">가격</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">상태</th>
                    <th class="text-right font-black text-xs text-base-content/40 uppercase tracking-widest">관리</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="product in products" :key="product.id" class="border-base-300/20 hover:bg-base-200/40 transition-colors">
                    <td class="font-mono text-xs text-base-content/40">{{ product.id?.substring(0, 8) }}</td>
                    <td class="font-black">{{ product.title }}</td>
                    <td class="text-sm">
                      <div class="font-bold">{{ displayUserName(product.sellerId) }}</div>
                      <div v-if="displayUserEmail(product.sellerId)" class="text-xs text-base-content/30">{{ displayUserEmail(product.sellerId) }}</div>
                    </td>
                    <td class="font-black">₩{{ product.price?.toLocaleString() }}</td>
                    <td>
                      <span class="text-sm font-black" :class="product.status === 'ENABLE' ? 'text-success' : 'text-error'">
                        {{ product.status === 'ENABLE' ? '활성' : '비활성' }}
                      </span>
                    </td>
                    <td class="text-right">
                      <button
                        v-if="product.status === 'ENABLE'"
                        @click="forceDown(product.id)"
                        class="btn btn-sm rounded-xl font-black bg-error/10 text-error hover:bg-error hover:text-white border-none gap-1.5 transition-all"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        상픔 판매 중지
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Orders -->
          <div v-else-if="activeTab === 'orders'" class="card bg-base-100 rounded-[28px] shadow-sm border border-base-300/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <!-- 필터 -->
            <div class="p-4 border-b border-base-300/20 flex flex-wrap gap-3 items-end">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-black text-base-content/40 uppercase tracking-widest">상태</label>
                <select v-model="orderFilter.status" class="select select-sm rounded-xl border-base-300/40 bg-base-200/50 font-semibold min-w-[120px]">
                  <option value="">전체</option>
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                  <option value="EXPIRED">EXPIRED</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-black text-base-content/40 uppercase tracking-widest">판매자 이메일</label>
                <input v-model="orderFilter.sellerEmail" type="text" placeholder="판매자 이메일" class="input input-sm rounded-xl border-base-300/40 bg-base-200/50 w-48" @keyup.enter="fetchData" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-black text-base-content/40 uppercase tracking-widest">시작일</label>
                <input v-model="orderFilter.startDate" type="datetime-local" class="input input-sm rounded-xl border-base-300/40 bg-base-200/50" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-black text-base-content/40 uppercase tracking-widest">종료일</label>
                <input v-model="orderFilter.endDate" type="datetime-local" class="input input-sm rounded-xl border-base-300/40 bg-base-200/50" />
              </div>
              <button @click="fetchData" class="btn btn-primary btn-sm rounded-xl font-black px-5">검색</button>
              <button @click="resetOrderFilter(); fetchData()" class="btn btn-ghost btn-sm rounded-xl font-black text-base-content/40">초기화</button>
            </div>
            <div class="overflow-x-auto">
              <table class="table w-full">
                <thead>
                  <tr class="border-base-300/30">
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">ID</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">상품일정</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">구매자</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">판매자</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">수량</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">금액</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">상태</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">주문일</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="order in orders" :key="order.id" class="border-base-300/20 hover:bg-base-200/40 transition-colors">
                    <td class="font-mono text-xs text-base-content/40">{{ order.id?.toString().substring(0, 8) }}</td>
                    <td class="font-mono text-xs text-base-content/40">{{ order.productScheduleId?.toString().substring(0, 8) }}</td>
                    <td class="text-sm">
                      <div class="font-bold">{{ displayUserName(order.userId) }}</div>
                      <div v-if="displayUserEmail(order.userId)" class="text-xs text-base-content/30">{{ displayUserEmail(order.userId) }}</div>
                    </td>
                    <td class="text-sm">
                      <template v-if="order.sellerId">
                        <div class="font-bold">{{ displayUserName(order.sellerId) }}</div>
                        <div v-if="displayUserEmail(order.sellerId)" class="text-xs text-base-content/30">{{ displayUserEmail(order.sellerId) }}</div>
                      </template>
                      <span v-else class="text-base-content/30">-</span>
                    </td>
                    <td class="font-bold">{{ order.quantity }}</td>
                    <td class="font-black">₩{{ order.price?.toLocaleString() }}</td>
                    <td class="text-sm font-black text-base-content/60">{{ order.status }}</td>
                    <td class="text-sm text-base-content/40">{{ formatDate(order.createdAt) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Settlements -->
          <div v-else-if="activeTab === 'settlements'" class="card bg-base-100 rounded-[28px] shadow-sm border border-base-300/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <!-- 필터 -->
            <div class="p-4 border-b border-base-300/20 flex flex-wrap gap-3 items-end">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-black text-base-content/40 uppercase tracking-widest">상태</label>
                <select v-model="settlementFilter.status" class="select select-sm rounded-xl border-base-300/40 bg-base-200/50 font-semibold min-w-[130px]">
                  <option value="">전체</option>
                  <option value="READY">READY</option>
                  <option value="TRANSFERRING">TRANSFERRING</option>
                  <option value="SENT">SENT</option>
                  <option value="FAILED">FAILED</option>
                  <option value="HOLD">HOLD</option>
                </select>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-black text-base-content/40 uppercase tracking-widest">판매자 이메일</label>
                <input v-model="settlementFilter.sellerEmail" type="text" placeholder="판매자 이메일" class="input input-sm rounded-xl border-base-300/40 bg-base-200/50 w-48" @keyup.enter="fetchData" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-black text-base-content/40 uppercase tracking-widest">정산 월</label>
                <input v-model="settlementFilter.settlementMonth" type="month" class="input input-sm rounded-xl border-base-300/40 bg-base-200/50" />
              </div>
              <button @click="fetchData" class="btn btn-primary btn-sm rounded-xl font-black px-5">검색</button>
              <button @click="resetSettlementFilter(); fetchData()" class="btn btn-ghost btn-sm rounded-xl font-black text-base-content/40">초기화</button>
            </div>
            <div class="overflow-x-auto">
              <table class="table w-full">
                <thead>
                  <tr class="border-base-300/30">
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">ID</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">판매자</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">정산액</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">상태</th>
                    <th class="font-black text-xs text-base-content/40 uppercase tracking-widest">이체일</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in settlements" :key="s.id" class="border-base-300/20 hover:bg-base-200/40 transition-colors">
                    <td class="font-mono text-xs text-base-content/40">{{ s.id?.toString().substring(0, 8) }}</td>
                    <td class="text-sm">
                      <div class="font-bold">{{ displayUserName(s.sellerId) }}</div>
                      <div v-if="displayUserEmail(s.sellerId)" class="text-xs text-base-content/30">{{ displayUserEmail(s.sellerId) }}</div>
                    </td>
                    <td class="font-black">₩{{ s.settlementAmount?.toLocaleString() }}</td>
                    <td class="text-sm font-black text-base-content/60">{{ s.status }}</td>
                    <td class="text-sm text-base-content/40">{{ formatDate(s.transferredAt) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </template>
      </main>
    </div>
  </div>
</template>
