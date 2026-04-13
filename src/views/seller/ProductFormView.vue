<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { filesApi } from '@/api/files'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()
const auth = useAuthStore()

const title = ref('')
const price = ref('')
const maxCapacity = ref('')
const description = ref('')
const errorMessage = ref('')

const uploadedFileIds = ref([])
const previews = ref([]) // { fileId, dataUrl, order }
const uploadStatus = ref('')
const uploading = ref(false)
const submitting = ref(false)

const schedules = ref([{ scheduleDt: '', startTime: '', endTime: '' }])

function addSchedule() {
  schedules.value.push({ scheduleDt: '', startTime: '', endTime: '' })
}
function removeSchedule(idx) {
  if (schedules.value.length > 1) schedules.value.splice(idx, 1)
}

async function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  const remaining = 10 - uploadedFileIds.value.length
  const toUpload = files.slice(0, remaining)
  if (toUpload.length === 0) { uploadStatus.value = '이미지는 최대 10장까지 첨부할 수 있습니다.'; return }

  uploading.value = true
  submitting.value = true
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
      previews.value.push({ fileId, dataUrl })
      uploadStatus.value = `이미지 업로드 중... (${i + 1}/${toUpload.length})`
    } catch {
      uploadStatus.value = `"${file.name}" 업로드 실패`
    }
  }

  uploading.value = false
  submitting.value = false
  uploadStatus.value = uploadedFileIds.value.length > 0 ? `${uploadedFileIds.value.length}장 업로드 완료` : ''
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
  const idx = uploadedFileIds.value.indexOf(fileId)
  if (idx > -1) uploadedFileIds.value.splice(idx, 1)
  previews.value = previews.value.filter(p => p.fileId !== fileId)
  uploadStatus.value = uploadedFileIds.value.length > 0 ? `${uploadedFileIds.value.length}장 업로드됨` : ''
}

async function submitForm() {
  if (uploading.value) return
  errorMessage.value = ''
  submitting.value = true
  try {
    await productsApi.create({
      sellerId: auth.user?.userId,
      title: title.value,
      maxCapacity: Number(maxCapacity.value),
      description: description.value,
      imageIds: uploadedFileIds.value,
      price: Number(price.value),
      status: 'ENABLE',
      schedules: schedules.value,
    })
    router.push('/products')
  } catch (e) {
    errorMessage.value = e.response?.data?.message || '상품 등록에 실패했습니다.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      <header class="flex justify-between items-center mb-10 pb-4 border-b border-gray-200 dark:border-gray-800">
        <RouterLink to="/products" class="text-2xl font-bold tracking-tight">Jaba 클래스</RouterLink>
        <ThemeToggle />
      </header>

      <div class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
        <h2 class="text-xl font-bold mb-8">상품 등록</h2>

        <div v-if="errorMessage"
          class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
          {{ errorMessage }}
        </div>

        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">상품명 *</label>
            <input v-model="title" type="text" required placeholder="상품명을 입력해주세요"
              class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">가격 (원) *</label>
            <input v-model="price" type="number" required min="1" placeholder="가격을 입력해주세요"
              class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">최대 인원 *</label>
            <input v-model="maxCapacity" type="number" required min="1" placeholder="최대 인원을 입력해주세요"
              class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">상품 설명</label>
            <textarea v-model="description" rows="4" placeholder="상품에 대한 설명을 입력해주세요"
              class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"></textarea>
          </div>

          <!-- 이미지 업로드 -->
          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">상품 이미지 (최대 10장)</label>
            <div class="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              @click="$refs.fileInput.click()">
              <svg class="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p class="text-sm text-gray-400 dark:text-gray-500">클릭하여 이미지 파일 선택</p>
              <p class="text-xs text-gray-400 dark:text-gray-600 mt-1">JPG, PNG, WEBP (선택 사항)</p>
            </div>
            <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFileSelect" />

            <div v-if="previews.length" class="mt-3 grid grid-cols-3 gap-2">
              <div v-for="(preview, idx) in previews" :key="preview.fileId" class="relative group">
                <img :src="preview.dataUrl" class="w-full h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
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
            <p v-if="uploadStatus" class="mt-2 text-xs" :class="uploading ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'">
              {{ uploadStatus }}
            </p>
          </div>

          <!-- 클래스 일정 -->
          <div>
            <div class="flex justify-between items-center mb-2">
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400">클래스 일정</label>
              <button type="button" @click="addSchedule"
                class="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                + 일정 추가
              </button>
            </div>
            <div class="space-y-3">
              <div v-for="(schedule, idx) in schedules" :key="idx" class="flex gap-2 items-start">
                <div class="flex-1">
                  <input v-model="schedule.scheduleDt" type="date" required
                    class="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                </div>
                <div class="w-28">
                  <input v-model="schedule.startTime" type="time" required
                    class="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                </div>
                <div class="w-28">
                  <input v-model="schedule.endTime" type="time" required
                    class="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
                </div>
                <button type="button" @click="removeSchedule(idx)"
                  class="mt-2.5 text-gray-400 hover:text-red-500 transition-colors text-lg leading-none">×</button>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <RouterLink to="/products"
              class="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded-lg text-sm text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              취소
            </RouterLink>
            <button type="button" @click="submitForm" :disabled="submitting"
              class="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-50">
              등록하기
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
