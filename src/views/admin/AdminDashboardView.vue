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

// UUID → { name, email } 캐시
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
      const res = await adminApi.getUsers()
      users.value = res.data?.data?.content ?? []
    } else if (activeTab.value === 'products') {
      const res = await adminApi.getProducts()
      products.value = res.data?.data?.content ?? []
      await resolveUsers(products.value.map(p => p.sellerId))
    } else if (activeTab.value === 'orders') {
      const res = await adminApi.getOrders()
      orders.value = res.data?.data?.content ?? []
      const orderUserIds = orders.value.flatMap(o => [o.userId, o.sellerId].filter(Boolean))
      await resolveUsers(orderUserIds)
    } else if (activeTab.value === 'settlements') {
      const res = await adminApi.getSettlements()
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
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white p-8">
    <div class="max-w-7xl mx-auto">
      <header class="flex justify-between items-center mb-8 pb-4 border-b border-gray-200 dark:border-gray-800">
        <h1 class="text-3xl font-bold">관리자 페이지</h1>
        <div class="flex items-center gap-4">
          <button
            @click="runEsMigrate"
            :disabled="esMigrating"
            class="text-sm px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold transition-colors"
          >
            {{ esMigrating ? 'ES 색인 중...' : 'ES 색인 (DB → ES)' }}
          </button>
          <ThemeToggle />
          <RouterLink to="/products" class="text-sm hover:underline">메인으로</RouterLink>
        </div>
      </header>

      <!-- Tabs -->
      <div class="flex gap-4 mb-8">
        <button
          v-for="tab in ['users', 'products', 'orders', 'settlements']"
          :key="tab"
          @click="switchTab(tab)"
          class="px-6 py-2 rounded-xl font-bold transition-colors capitalize"
          :class="activeTab === tab
            ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
            : 'bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'"
        >
          {{ tab }}
        </button>
      </div>

      <div v-if="loading" class="text-center py-20">
        <p class="text-gray-500">데이터를 불러오는 중...</p>
      </div>

      <div v-else class="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <!-- Users Table -->
        <table v-if="activeTab === 'users'" class="w-full text-left">
          <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs uppercase font-bold text-gray-500">
            <tr>
              <th class="px-6 py-4">ID</th>
              <th class="px-6 py-4">이름</th>
              <th class="px-6 py-4">이메일</th>
              <th class="px-6 py-4">역할</th>
              <th class="px-6 py-4">가입일</th>
              <th class="px-6 py-4 text-right">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
              <td class="px-6 py-4 text-sm font-mono">{{ user.id?.substring(0, 8) }}</td>
              <td class="px-6 py-4">{{ user.name }}</td>
              <td class="px-6 py-4 text-gray-500">{{ user.email }}</td>
              <td class="px-6 py-4">
                <span :class="user.role === 'ADMIN' ? 'text-red-500' : user.role === 'SELLER' ? 'text-blue-500' : 'text-gray-500'" class="text-xs font-bold">
                  {{ user.role }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ formatDate(user.createdAt) }}</td>
              <td class="px-6 py-4 text-right">
                <button
                  v-if="user.role === 'USER'"
                  @click="approveSeller(user.id)"
                  class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg"
                >
                  셀러 승인
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Products Table -->
        <table v-if="activeTab === 'products'" class="w-full text-left">
          <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs uppercase font-bold text-gray-500">
            <tr>
              <th class="px-6 py-4">ID</th>
              <th class="px-6 py-4">상품명</th>
              <th class="px-6 py-4">판매자</th>
              <th class="px-6 py-4">가격</th>
              <th class="px-6 py-4">상태</th>
              <th class="px-6 py-4 text-right">관리</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="product in products" :key="product.id" class="hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
              <td class="px-6 py-4 text-sm font-mono">{{ product.id?.substring(0, 8) }}</td>
              <td class="px-6 py-4 font-medium">{{ product.title }}</td>
              <td class="px-6 py-4 text-sm">
                <div class="text-gray-700 dark:text-gray-300">{{ displayUserName(product.sellerId) }}</div>
                <div v-if="displayUserEmail(product.sellerId)" class="text-xs text-gray-400">{{ displayUserEmail(product.sellerId) }}</div>
              </td>
              <td class="px-6 py-4">₩{{ product.price?.toLocaleString() }}</td>
              <td class="px-6 py-4 text-xs font-bold" :class="product.status === 'ENABLE' ? 'text-green-500' : 'text-red-500'">
                {{ product.status }}
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  v-if="product.status === 'ENABLE'"
                  @click="forceDown(product.id)"
                  class="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg"
                >
                  상품 강제 삭제
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Orders Table -->
        <table v-if="activeTab === 'orders'" class="w-full text-left">
          <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs uppercase font-bold text-gray-500">
            <tr>
              <th class="px-6 py-4">ID</th>
              <th class="px-6 py-4">상품일정 ID</th>
              <th class="px-6 py-4">구매자</th>
              <th class="px-6 py-4">판매자</th>
              <th class="px-6 py-4">수량</th>
              <th class="px-6 py-4">금액</th>
              <th class="px-6 py-4">상태</th>
              <th class="px-6 py-4">주문일</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="order in orders" :key="order.id" class="hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
              <td class="px-6 py-4 text-sm font-mono">{{ order.id?.toString().substring(0, 8) }}</td>
              <td class="px-6 py-4 text-sm font-mono text-gray-500">{{ order.productScheduleId?.toString().substring(0, 8) }}</td>
              <td class="px-6 py-4 text-sm">
                <div class="text-gray-700 dark:text-gray-300">{{ displayUserName(order.userId) }}</div>
                <div v-if="displayUserEmail(order.userId)" class="text-xs text-gray-400">{{ displayUserEmail(order.userId) }}</div>
              </td>
              <td class="px-6 py-4 text-sm">
                <template v-if="order.sellerId">
                  <div class="text-gray-700 dark:text-gray-300">{{ displayUserName(order.sellerId) }}</div>
                  <div v-if="displayUserEmail(order.sellerId)" class="text-xs text-gray-400">{{ displayUserEmail(order.sellerId) }}</div>
                </template>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-6 py-4">{{ order.quantity }}</td>
              <td class="px-6 py-4 font-bold">₩{{ order.price?.toLocaleString() }}</td>
              <td class="px-6 py-4 text-xs font-bold uppercase">{{ order.status }}</td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ formatDate(order.createdAt) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Settlements Table -->
        <table v-if="activeTab === 'settlements'" class="w-full text-left">
          <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs uppercase font-bold text-gray-500">
            <tr>
              <th class="px-6 py-4">ID</th>
              <th class="px-6 py-4">판매자 정보</th>
              <th class="px-6 py-4">정산액</th>
              <th class="px-6 py-4">상태</th>
              <th class="px-6 py-4">이체일</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr v-for="s in settlements" :key="s.id" class="hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
              <td class="px-6 py-4 text-sm font-mono">{{ s.id?.toString().substring(0, 8) }}</td>
              <td class="px-6 py-4 text-sm">
                <div class="text-gray-700 dark:text-gray-300">{{ displayUserName(s.sellerId) }}</div>
                <div v-if="displayUserEmail(s.sellerId)" class="text-xs text-gray-400">{{ displayUserEmail(s.sellerId) }}</div>
              </td>
              <td class="px-6 py-4 font-bold">₩{{ s.settlementAmount?.toLocaleString() }}</td>
              <td class="px-6 py-4">
                <span class="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                  {{ s.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ formatDate(s.transferredAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
