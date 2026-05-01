<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { authApi } from '@/api/auth'
import { usersApi } from '@/api/users'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { resolveImageUrl } from '@/utils/imageUrl'

const router = useRouter()
const auth = useAuthStore()

const products = ref([])
const loading = ref(true)
const deletingId = ref(null)
const loadError = ref('')
const settlementAccountModalOpen = ref(false)
const savingSettlementAccount = ref(false)
const savedSettlementAccount = ref(null)
const settlementAccountForm = ref({
  bankCode: '',
  accountNumber: '',
  accountHolder: '',
  active: true,
})

onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
  if (!auth.isSeller && !auth.isAdmin) { router.push('/products'); return }
  await loadProducts()
})

async function loadProducts() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await productsApi.my({ thisPage: 0, pageSize: 100 })
    console.log('[seller products] response:', res.data)
    const d = res.data?.data
    products.value = Array.isArray(d) ? d : (d?.items ?? d?.content ?? [])
  } catch (e) {
    console.error('[seller products] error:', e.response ?? e)
    loadError.value = e.response?.data?.message || '상품 목록을 불러오지 못했습니다.'
    products.value = []
  } finally {
    loading.value = false
  }
}

async function deleteProduct(productId) {
  if (!confirm('정말 이 상품을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.')) return
  deletingId.value = productId
  try {
    await productsApi.delete(productId)
    products.value = products.value.filter(p => p.id !== productId)
  } catch (e) {
    alert(e.response?.data?.message || '상품 삭제에 실패했습니다.')
  } finally {
    deletingId.value = null
  }
}

async function logout() {
  try { await authApi.logout() } catch { /* ignore */ }
  auth.clearToken()
  router.push('/login')
}

function openSettlementAccountModal() {
  settlementAccountForm.value = {
    bankCode: savedSettlementAccount.value?.bankCode ?? '',
    accountNumber: savedSettlementAccount.value?.accountNumber ?? '',
    accountHolder: savedSettlementAccount.value?.accountHolder ?? auth.user?.name ?? '',
    active: savedSettlementAccount.value?.active ?? true,
  }
  settlementAccountModalOpen.value = true
}

function closeSettlementAccountModal() {
  if (savingSettlementAccount.value) return
  settlementAccountModalOpen.value = false
}

async function submitSettlementAccount() {
  const bankCode = settlementAccountForm.value.bankCode.trim()
  const accountNumber = settlementAccountForm.value.accountNumber.trim()
  const accountHolder = settlementAccountForm.value.accountHolder.trim()

  if (!bankCode || !accountNumber || !accountHolder) {
    alert('은행 코드, 계좌번호, 예금주를 모두 입력해 주세요.')
    return
  }

  savingSettlementAccount.value = true
  try {
    const res = await usersApi.upsertSellerSettlementAccount({
      bankCode,
      accountNumber,
      accountHolder,
      active: Boolean(settlementAccountForm.value.active),
    })

    savedSettlementAccount.value = res.data?.data ?? res.data ?? null
    settlementAccountModalOpen.value = false
    alert('정산 계좌가 저장되었습니다.')
  } catch (e) {
    alert(e.response?.data?.message || '정산 계좌 저장에 실패했습니다.')
  } finally {
    savingSettlementAccount.value = false
  }
}

function formatPrice(p) { return Number(p).toLocaleString('ko-KR') }
</script>

<template>
  <div class="bg-base-200 min-h-screen pb-20">
    <!-- Navbar -->
    <div class="navbar bg-base-100/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-10 border-b border-base-300/50">
      <div class="flex-1">
        <RouterLink to="/products" class="hover:opacity-80 transition-opacity">
          <svg width="220" height="50" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg" class="h-12 lg:h-14 w-auto">
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
      <div class="flex-none flex items-center gap-4">
        <ThemeToggle />
        <RouterLink to="/mypage" class="btn btn-ghost btn-sm rounded-full font-bold">마이페이지</RouterLink>
        <button @click="logout" class="btn btn-ghost btn-sm rounded-full font-bold text-error/70">로그아웃</button>
      </div>
    </div>

    <div class="max-w-5xl mx-auto px-4 py-10 lg:py-16">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 px-2 animate-in fade-in slide-in-from-top-4 duration-500">
        <div>
          <h1 class="text-3xl lg:text-4xl font-black text-base-content tracking-tight mb-2">내 상품 관리</h1>
          <p class="text-base-content/40 font-bold">등록하신 클래스를 한눈에 확인하고 관리하세요.</p>
        </div>
        <div class="flex gap-3">
          <button
            @click="openSettlementAccountModal"
            class="btn bg-base-100 hover:bg-base-300 border-none rounded-2xl px-6 font-black transition-all"
          >
            🏦 정산 계좌 등록 / 수정
          </button>
          <RouterLink to="/seller/settlements" class="btn bg-base-100 hover:bg-base-300 border-none rounded-2xl px-6 font-black transition-all">
            💰 정산 확인
          </RouterLink>
          <RouterLink to="/seller/products/new" class="btn btn-primary rounded-2xl px-8 font-black shadow-xl shadow-primary/20 border-none transition-all active:scale-95">
            ✨ 상품 등록
          </RouterLink>
        </div>
      </div>

      <div v-if="loadError" class="alert bg-error/10 border-none text-error py-4 rounded-2xl mb-6 font-black">{{ loadError }}</div>

      <div v-if="loading" class="flex flex-col justify-center items-center py-32 gap-4">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="text-base-content/40 font-medium">상품 목록을 가져오고 있어요...</p>
      </div>

      <div v-else-if="products.length === 0" class="card bg-base-100 rounded-[40px] shadow-sm border border-base-300/20 animate-in fade-in zoom-in duration-500">
        <div class="card-body items-center text-center py-24">
          <div class="w-24 h-24 bg-base-200 rounded-[32px] flex items-center justify-center text-5xl mb-6">🏝️</div>
          <h3 class="text-xl font-black mb-2">아직 등록된 상품이 없어요</h3>
          <p class="text-base-content/40 font-bold mb-10">첫 번째 클래스를 등록하고 수강생들을 만나보세요!</p>
          <RouterLink to="/seller/products/new" class="btn btn-primary btn-lg rounded-2xl px-12 font-black shadow-xl shadow-primary/20 border-none transition-all active:scale-95">
            첫 상품 등록하기
          </RouterLink>
        </div>
      </div>

      <div v-else class="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div v-for="product in products" :key="product.id" 
          class="card bg-base-100 rounded-[32px] border border-base-300/20 hover:shadow-md transition-all group overflow-hidden">
          <div class="card-body p-6 lg:p-8 flex-row items-center gap-6">
            <div class="w-20 h-20 lg:w-24 lg:h-24 rounded-3xl overflow-hidden bg-base-200 shrink-0 relative">
              <img v-if="product.thumbnailPath" :src="resolveImageUrl(product.thumbnailPath)" alt="상품 이미지" 
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div v-else class="w-full h-full flex items-center justify-center text-4xl opacity-20">🎨</div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 mb-2">
                <h3 class="text-lg lg:text-xl font-black truncate group-hover:text-primary transition-colors">{{ product.title }}</h3>
                <span :class="product.status === 'ENABLE' ? 'bg-success/10 text-success' : 'bg-base-200 text-base-content/30'" 
                  class="badge border-none font-black text-[10px] py-2.5 px-3 uppercase tracking-wider">
                  {{ product.status === 'ENABLE' ? '판매중' : '비활성' }}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-y-1 gap-x-4">
                <p class="text-lg font-black text-primary tracking-tight">₩{{ formatPrice(product.price) }}</p>
                <div class="flex items-center gap-1.5 text-xs font-bold text-base-content/30">
                  <span class="w-1 h-1 rounded-full bg-base-content/20"></span>
                  최대 정원 {{ product.maxCapacity }}명
                </div>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-2 shrink-0">
              <RouterLink :to="`/products/${product.id}`" class="btn btn-ghost bg-base-200 rounded-xl px-4 text-xs font-black">보기</RouterLink>
              <RouterLink :to="`/seller/products/${product.id}/edit`" class="btn btn-ghost bg-base-200 rounded-xl px-4 text-xs font-black">수정</RouterLink>
              <button @click="deleteProduct(product.id)" :disabled="deletingId === product.id" 
                class="btn btn-error btn-outline rounded-xl px-4 text-xs font-black hover:text-white transition-all">
                <span v-if="deletingId === product.id" class="loading loading-spinner loading-xs"></span>
                <span v-else>삭제</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="settlementAccountModalOpen" class="modal modal-open backdrop-blur-md">
      <div class="modal-box rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl border border-base-300/30 max-w-xl">
        <div class="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 class="text-2xl font-black text-base-content">정산 계좌 등록 / 수정</h3>
            <p class="text-sm text-base-content/50 font-bold mt-2">
              seller 또는 admin 계정의 정산 계좌를 등록하거나 수정합니다.
            </p>
          </div>
          <button @click="closeSettlementAccountModal" class="btn btn-ghost btn-sm rounded-full">✕</button>
        </div>

        <div class="space-y-4">
          <label class="form-control w-full">
            <div class="label pb-2">
              <span class="label-text font-black text-base-content/70">은행 코드</span>
            </div>
            <input
              v-model="settlementAccountForm.bankCode"
              type="text"
              placeholder="예: 004"
              class="input input-bordered rounded-2xl w-full"
            />
          </label>

          <label class="form-control w-full">
            <div class="label pb-2">
              <span class="label-text font-black text-base-content/70">계좌번호</span>
            </div>
            <input
              v-model="settlementAccountForm.accountNumber"
              type="text"
              placeholder="계좌번호를 입력해 주세요"
              class="input input-bordered rounded-2xl w-full"
            />
          </label>

          <label class="form-control w-full">
            <div class="label pb-2">
              <span class="label-text font-black text-base-content/70">예금주</span>
            </div>
            <input
              v-model="settlementAccountForm.accountHolder"
              type="text"
              placeholder="예금주명을 입력해 주세요"
              class="input input-bordered rounded-2xl w-full"
            />
          </label>

          <label class="label justify-start gap-3 cursor-pointer rounded-2xl bg-base-200/70 px-4 py-4 mt-2">
            <input v-model="settlementAccountForm.active" type="checkbox" class="toggle toggle-primary" />
            <div>
              <span class="label-text font-black text-base-content">정산 계좌 활성화</span>
              <p class="text-xs text-base-content/50 font-bold mt-1">비활성화하면 송금 대상에서 제외될 수 있습니다.</p>
            </div>
          </label>

          <div class="rounded-2xl bg-base-200/60 px-4 py-4 text-sm text-base-content/60 font-bold">
            기존 계좌가 이미 등록되어 있다면, 입력한 값으로 수정됩니다.
          </div>
        </div>

        <div class="modal-action mt-8 flex-col sm:flex-row">
          <button @click="closeSettlementAccountModal" class="btn btn-outline rounded-2xl flex-1" :disabled="savingSettlementAccount">
            취소
          </button>
          <button @click="submitSettlementAccount" class="btn btn-primary rounded-2xl flex-1" :disabled="savingSettlementAccount">
            <span v-if="savingSettlementAccount" class="loading loading-spinner loading-sm"></span>
            <span v-else>저장</span>
          </button>
        </div>
      </div>
      <div class="modal-backdrop bg-base-content/20" @click="closeSettlementAccountModal"></div>
    </div>
  </div>
</template>
