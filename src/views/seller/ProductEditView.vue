<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { filesApi } from '@/api/files'
import ThemeToggle from '@/components/ThemeToggle.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const productId = route.params.productId

const title = ref('')
const price = ref('')
const maxCapacity = ref('')
const description = ref('')
const status = ref('ENABLE')
const errorMessage = ref('')
const successMessage = ref('')
const submitting = ref(false)
const loading = ref(true)

// 이미지
const uploadedFileIds = ref([])
const previews = ref([]) // { fileId, url, isNew }
const uploadStatus = ref('')
const uploading = ref(false)

// 일정
const existingSchedules = ref([])
const newSchedules = ref([])
const deletingScheduleId = ref(null)

onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
  if (!auth.isSeller) { router.push('/products'); return }

  try {
    const [productRes, scheduleRes] = await Promise.all([
      productsApi.detail(productId),
      productsApi.schedules(productId),
    ])
    const product = productRes.data?.data ?? productRes.data
    existingSchedules.value = scheduleRes.data?.data ?? scheduleRes.data ?? []

    title.value = product.title ?? ''
    price.value = String(product.price ?? '')
    maxCapacity.value = String(product.maxCapacity ?? '')
    description.value = product.description ?? ''
    status.value = product.status ?? 'ENABLE'

    // 기존 이미지 로드
    if (product.imagePaths?.length) {
      product.imagePaths.forEach((url, i) => {
        const fileId = product.imageIds?.[i] ?? `existing-${i}`
        uploadedFileIds.value.push(fileId)
        previews.value.push({ fileId, url, isNew: false })
      })
    }
  } catch (e) {
    errorMessage.value = '상품 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
})

async function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  const remaining = 10 - previews.value.length
  const toUpload = files.slice(0, remaining)
  if (toUpload.length === 0) { uploadStatus.value = '이미지는 최대 10장까지 첨부할 수 있습니다.'; return }

  uploading.value = true
  uploadStatus.value = `이미지 업로드 중... (0/${toUpload.length})`

  for (let i = 0; i < toUpload.length; i++) {
    const file = toUpload[i]
    try {
      const uploadRes = await filesApi.uploadRequest(file.name)
      const { fileId, uploadUrl } = uploadRes.data.data
      await fetch(uploadUrl, { method: 'PUT', body: await file.arrayBuffer() })
      await filesApi.complete(fileId)

      uploadedFileIds.value.push(fileId)
      const dataUrl = await readAsDataURL(file)
      previews.value.push({ fileId, url: dataUrl, isNew: true })
      uploadStatus.value = `이미지 업로드 중... (${i + 1}/${toUpload.length})`
    } catch {
      uploadStatus.value = `"${file.name}" 업로드 실패`
    }
  }

  uploading.value = false
  uploadStatus.value = `${previews.value.length}장 업로드됨`
  event.target.value = ''
}

function readAsDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

function removeImage(fileId) {
  uploadedFileIds.value = uploadedFileIds.value.filter(id => id !== fileId)
  previews.value = previews.value.filter(p => p.fileId !== fileId)
  uploadStatus.value = previews.value.length > 0 ? `${previews.value.length}장 업로드됨` : ''
}

async function deleteSchedule(scheduleId) {
  if (!confirm('이 일정을 삭제하시겠습니까?')) return
  deletingScheduleId.value = scheduleId
  try {
    await productsApi.deleteSchedule(productId, scheduleId)
    existingSchedules.value = existingSchedules.value.filter(s => s.id !== scheduleId)
  } catch (e) {
    alert(e.response?.data?.message || '일정 삭제에 실패했습니다.')
  } finally {
    deletingScheduleId.value = null
  }
}

async function addNewSchedule(schedule) {
  if (!schedule.scheduleDt || !schedule.startTime || !schedule.endTime) {
    alert('날짜와 시간을 모두 입력해주세요.'); return
  }
  try {
    const res = await productsApi.createSchedule(productId, schedule)
    const created = res.data?.data ?? res.data
    existingSchedules.value.push(created)
    const idx = newSchedules.value.indexOf(schedule)
    if (idx > -1) newSchedules.value.splice(idx, 1)
  } catch (e) {
    alert(e.response?.data?.message || '일정 추가에 실패했습니다.')
  }
}

function addScheduleRow() {
  newSchedules.value.push({ scheduleDt: '', startTime: '', endTime: '' })
}
function removeScheduleRow(idx) {
  newSchedules.value.splice(idx, 1)
}

async function submitForm() {
  if (uploading.value) return
  errorMessage.value = ''
  successMessage.value = ''
  submitting.value = true
  try {
    // 신규 imageIds만 전송 (기존 이미지 유지 위해 전체 전송)
    const imageIds = uploadedFileIds.value.filter(id => !id.startsWith('existing-'))
    await productsApi.update(productId, {
      title: title.value,
      maxCapacity: Number(maxCapacity.value),
      description: description.value,
      imageIds,
      price: Number(price.value),
      status: status.value,
    })
    successMessage.value = '상품이 수정되었습니다.'
    setTimeout(() => router.push('/seller/products'), 1200)
  } catch (e) {
    errorMessage.value = e.response?.data?.message || '상품 수정에 실패했습니다.'
  } finally {
    submitting.value = false
  }
}

const SCHEDULE_STATUS = {
  AVAILABLE: '예약 가능',
  FULL: '마감',
  CLOSED: '종료',
  PENDING: '대기중',
}
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <header class="flex justify-between items-center mb-10 pb-4 border-b border-gray-200 dark:border-gray-800">
        <RouterLink to="/seller/products" class="text-2xl font-bold tracking-tight">Jaba 클래스</RouterLink>
        <ThemeToggle />
      </header>

      <div v-if="loading" class="text-center text-gray-400 dark:text-gray-500 py-20">불러오는 중...</div>

      <template v-else>
        <!-- 상품 정보 수정 -->
        <div class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 mb-6">
          <h2 class="text-xl font-bold mb-8">상품 수정</h2>

          <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">{{ errorMessage }}</div>
          <div v-if="successMessage" class="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-6 text-sm">{{ successMessage }}</div>

          <div class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">상품명 *</label>
              <input v-model="title" type="text" placeholder="상품명을 입력해주세요"
                class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">가격 (원) *</label>
                <input v-model="price" type="number" min="1" placeholder="가격"
                  class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">최대 인원 *</label>
                <input v-model="maxCapacity" type="number" min="1" placeholder="최대 인원"
                  class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">판매 상태</label>
              <select v-model="status"
                class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
                <option value="ENABLE">판매중</option>
                <option value="DISABLE">비활성</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">상품 설명</label>
              <textarea v-model="description" rows="4" placeholder="상품 설명을 입력해주세요"
                class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"></textarea>
            </div>

            <!-- 이미지 -->
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">상품 이미지 (최대 10장)</label>
              <div class="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-5 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                @click="$refs.fileInput.click()">
                <svg class="w-7 h-7 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-sm text-gray-400">이미지 추가하기</p>
              </div>
              <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFileSelect" />

              <div v-if="previews.length" class="mt-3 grid grid-cols-3 gap-2">
                <div v-for="(preview, idx) in previews" :key="preview.fileId" class="relative group">
                  <img :src="preview.url" class="w-full h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                  <button @click="removeImage(preview.fileId)" type="button"
                    class="absolute top-1 right-1 bg-black bg-opacity-60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    ×
                  </button>
                  <div class="absolute bottom-1 left-1 text-white text-xs px-1.5 py-0.5 rounded font-medium"
                    :class="idx === 0 ? 'bg-blue-500 bg-opacity-90' : 'bg-black bg-opacity-60'">
                    {{ idx === 0 ? '썸네일' : idx + 1 }}
                  </div>
                </div>
              </div>
              <p v-if="uploadStatus" class="mt-2 text-xs" :class="uploading ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'">{{ uploadStatus }}</p>
            </div>

            <div class="flex gap-3 pt-2">
              <RouterLink to="/seller/products"
                class="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded-lg text-sm text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                취소
              </RouterLink>
              <button type="button" @click="submitForm" :disabled="submitting || uploading"
                class="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-50">
                {{ submitting ? '저장 중...' : '저장하기' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 일정 관리 -->
        <div class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold">일정 관리</h2>
            <button @click="addScheduleRow" type="button"
              class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium">
              + 일정 추가
            </button>
          </div>

          <!-- 기존 일정 -->
          <div v-if="existingSchedules.length" class="space-y-2 mb-6">
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">등록된 일정</h3>
            <div v-for="schedule in existingSchedules" :key="schedule.id"
              class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#121212] rounded-lg border border-gray-200 dark:border-gray-800">
              <div class="flex-1 grid grid-cols-3 gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span>{{ schedule.scheduleDt }}</span>
                <span>{{ schedule.startTime }} ~ {{ schedule.endTime }}</span>
                <span class="text-xs text-gray-500">{{ SCHEDULE_STATUS[schedule.status] ?? schedule.status }}</span>
              </div>
              <button @click="deleteSchedule(schedule.id)"
                :disabled="deletingScheduleId === schedule.id"
                class="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50 shrink-0">
                {{ deletingScheduleId === schedule.id ? '삭제 중...' : '삭제' }}
              </button>
            </div>
          </div>

          <div v-else class="text-sm text-gray-400 dark:text-gray-500 mb-6">등록된 일정이 없습니다.</div>

          <!-- 신규 일정 입력 -->
          <div v-if="newSchedules.length" class="space-y-3">
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">추가할 일정</h3>
            <div v-for="(schedule, idx) in newSchedules" :key="idx" class="flex gap-2 items-start">
              <div class="flex-1">
                <input v-model="schedule.scheduleDt" type="date"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
              </div>
              <div class="w-28">
                <input v-model="schedule.startTime" type="time"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
              </div>
              <div class="w-28">
                <input v-model="schedule.endTime" type="time"
                  class="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
              </div>
              <button @click="addNewSchedule(schedule)" type="button"
                class="mt-0.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors">
                등록
              </button>
              <button @click="removeScheduleRow(idx)" type="button"
                class="mt-2.5 text-gray-400 hover:text-red-500 transition-colors text-lg leading-none">×</button>
            </div>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>
