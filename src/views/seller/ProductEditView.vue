<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { filesApi } from '@/api/files'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { loadDaumPostcode, loadKakaoMaps } from '@/utils/loadKakao'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const productId = route.params.productId

const title = ref('')
const price = ref(null)
const maxCapacity = ref(null)
const description = ref('')
const status = ref('ENABLE')
const roadAddress = ref('')
const detailAddress = ref('')
const zonecode = ref('')
const latitude = ref('')
const longitude = ref('')

const errorMessage = ref('')
const successMessage = ref('')
const uploadStatus = ref('')
const addressStatus = ref('')
const addressStatusIsError = ref(false)
const submitting = ref(false)
const loading = ref(true)
const uploading = ref(false)

const uploadedFileIds = ref([])
const previews = ref([])

const existingSchedules = ref([])
const newSchedules = ref([])
const deletingScheduleId = ref(null)

const SCHEDULE_STATUS = {
  AVAILABLE: '\uC608\uC57D \uAC00\uB2A5',
  FULL: '\uB9C8\uAC10',
  CLOSED: '\uC885\uB8CC',
  PENDING: '\uB300\uAE30\uC911',
}

function normalizePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizePositiveNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function preventNumberScroll(event) {
  event.target.blur()
}


onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
  if (!auth.isSeller) {
    router.push('/products')
    return
  }

  try {
    const [productRes, scheduleRes] = await Promise.all([
      productsApi.detail(productId),
      productsApi.schedules(productId),
    ])

    const product = productRes.data?.data ?? productRes.data
    existingSchedules.value = scheduleRes.data?.data ?? scheduleRes.data ?? []

    title.value = product.title ?? ''
    price.value = product.price != null ? Number(product.price) : null
    maxCapacity.value = product.maxCapacity != null ? Number(product.maxCapacity) : null
    description.value = product.description ?? ''
    status.value = product.status ?? 'ENABLE'
    roadAddress.value = product.roadAddress ?? ''
    detailAddress.value = product.detailAddress ?? ''
    zonecode.value = product.zonecode ?? ''
    latitude.value = product.latitude != null ? String(product.latitude) : ''
    longitude.value = product.longitude != null ? String(product.longitude) : ''

    if (product.imageIds?.length) {
      product.imageIds.forEach((fileId, index) => {
        uploadedFileIds.value.push(fileId)
        previews.value.push({ fileId, url: product.imagePaths?.[index] ?? '' })
      })
    }
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || '\uC0C1\uD488 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
  } finally {
    loading.value = false
  }
})

function getApiErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.data?.message ||
    error?.message ||
    fallback
  )
}

function getKakaoLoadMessage(error) {
  if (error?.code === 'KAKAO_KEY_MISSING') return '\uCE74\uCE74\uC624 JavaScript \uD0A4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. .env.local \uC124\uC815\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.'
  if (error?.code === 'KAKAO_MAP_LOAD_FAILED') return '\uCE74\uCE74\uC624 \uC9C0\uB3C4 SDK\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uD0A4\uB098 \uB4F1\uB85D\uD55C \uB3C4\uBA54\uC778\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.'
  if (error?.code === 'DAUM_POSTCODE_LOAD_FAILED') return '\uCE74\uCE74\uC624 \uC8FC\uC18C \uAC80\uC0C9 \uC2A4\uD06C\uB9BD\uD2B8\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.'
  return '\uC8FC\uC18C \uAC80\uC0C9 \uC11C\uBE44\uC2A4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
}

function readAsDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (event) => resolve(event.target?.result)
    reader.readAsDataURL(file)
  })
}

async function handleFileSelect(event) {
  const files = Array.from(event.target.files ?? [])
  const remaining = 10 - uploadedFileIds.value.length
  const toUpload = files.slice(0, remaining)

  if (toUpload.length === 0) {
    uploadStatus.value = '\uC774\uBBF8\uC9C0\uB294 \uCD5C\uB300 10\uAC1C\uAE4C\uC9C0 \uB4F1\uB85D\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'
    event.target.value = ''
    return
  }

  uploading.value = true
  uploadStatus.value = `\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC \uC911... (0/${toUpload.length})`

  for (let index = 0; index < toUpload.length; index += 1) {
    const file = toUpload[index]
    try {
      const uploadRes = await filesApi.uploadRequest(file.name)
      const { fileId, uploadUrl } = uploadRes.data.data
      await fetch(uploadUrl, { method: 'PUT', body: await file.arrayBuffer() })
      await filesApi.complete(fileId)
      uploadedFileIds.value.push(fileId)
      previews.value.push({ fileId, url: await readAsDataURL(file) })
      uploadStatus.value = `\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC \uC911... (${index + 1}/${toUpload.length})`
    } catch {
      uploadStatus.value = `"${file.name}" \uC5C5\uB85C\uB4DC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.`
    }
  }

  uploading.value = false
  uploadStatus.value = uploadedFileIds.value.length ? `\uCD1D ${uploadedFileIds.value.length}\uAC1C \uC774\uBBF8\uC9C0\uAC00 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.` : ''
  event.target.value = ''
}

function removeImage(fileId) {
  uploadedFileIds.value = uploadedFileIds.value.filter((id) => id !== fileId)
  previews.value = previews.value.filter((preview) => preview.fileId !== fileId)
  uploadStatus.value = uploadedFileIds.value.length ? `\uCD1D ${uploadedFileIds.value.length}\uAC1C \uC774\uBBF8\uC9C0\uAC00 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.` : ''
}

async function openAddressSearch() {
  addressStatus.value = ''
  addressStatusIsError.value = false

  try {
    const daum = await loadDaumPostcode()
    const kakao = await loadKakaoMaps()
    new daum.Postcode({
      oncomplete: (data) => {
        roadAddress.value = data.roadAddress || data.address || ''
        zonecode.value = data.zonecode || ''
        const geocoder = new kakao.maps.services.Geocoder()
        geocoder.addressSearch(roadAddress.value, (result, status) => {
          if (status !== kakao.maps.services.Status.OK || !result?.length) {
            latitude.value = ''
            longitude.value = ''
            addressStatus.value = '\uC8FC\uC18C\uB294 \uCC3E\uC558\uC9C0\uB9CC \uC88C\uD45C \uBCC0\uD658\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uC8FC\uC18C\uB97C \uB2E4\uC2DC \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.'
            addressStatusIsError.value = true
            return
          }
          longitude.value = result[0].x
          latitude.value = result[0].y
          addressStatus.value = '\uC8FC\uC18C\uC640 \uC88C\uD45C\uB97C \uBD88\uB7EC\uC654\uC2B5\uB2C8\uB2E4.'
        })
      },
    }).open()
  } catch (error) {
    addressStatus.value = getKakaoLoadMessage(error)
    addressStatusIsError.value = true
    alert(addressStatus.value)
  }
}

async function deleteSchedule(scheduleId) {
  if (!confirm('\uC774 \uC77C\uC815\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) return
  deletingScheduleId.value = scheduleId
  try {
    await productsApi.deleteSchedule(productId, scheduleId)
    existingSchedules.value = existingSchedules.value.filter((schedule) => schedule.id !== scheduleId)
  } catch (error) {
    alert(getApiErrorMessage(error, '\uC77C\uC815 \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.'))
  } finally {
    deletingScheduleId.value = null
  }
}

function addScheduleRow() {
  newSchedules.value.push({ scheduleDt: '', startTime: '', endTime: '', status: 'AVAILABLE' })
}

function removeScheduleRow(index) {
  newSchedules.value.splice(index, 1)
}

async function addNewSchedule(schedule) {
  if (!schedule.scheduleDt || !schedule.startTime || !schedule.endTime) {
    alert('\uB0A0\uC9DC\uC640 \uC2DC\uC791 \uC2DC\uAC04, \uC885\uB8CC \uC2DC\uAC04\uC744 \uBAA8\uB450 \uC785\uB825\uD574 \uC8FC\uC138\uC694.')
    return
  }

  try {
    const response = await productsApi.createSchedule(productId, {
      scheduleDt: schedule.scheduleDt,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: schedule.status,
    })
    const created = response.data?.data ?? response.data
    existingSchedules.value.push(created)
    newSchedules.value = newSchedules.value.filter((item) => item !== schedule)
  } catch (error) {
    alert(getApiErrorMessage(error, '\uC77C\uC815 \uCD94\uAC00\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.'))
  }
}

async function submitForm() {
  if (uploading.value || submitting.value) return
  errorMessage.value = ''
  successMessage.value = ''
  submitting.value = true

  try {
    await productsApi.update(productId, {
      title: title.value,
      maxCapacity: normalizePositiveInteger(maxCapacity.value),
      description: description.value,
      imageIds: uploadedFileIds.value,
      price: normalizePositiveNumber(price.value),
      status: status.value,
      roadAddress: roadAddress.value,
      detailAddress: detailAddress.value,
      zonecode: zonecode.value,
      latitude: latitude.value ? Number(latitude.value) : null,
      longitude: longitude.value ? Number(longitude.value) : null,
    })
    successMessage.value = '\uC0C1\uD488 \uC815\uBCF4\uAC00 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.'
    setTimeout(() => router.push('/seller/products'), 1200)
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, '\uC0C1\uD488 \uC218\uC815\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header class="flex justify-between items-center mb-10 pb-4 border-b border-gray-200 dark:border-gray-800">
        <RouterLink to="/seller/products" class="text-2xl font-bold tracking-tight">Jaba Trade</RouterLink>
        <ThemeToggle />
      </header>

      <div v-if="loading" class="text-center text-gray-400 dark:text-gray-500 py-20">&#48520;&#47084;&#50724;&#45716; &#51473;...</div>

      <template v-else>
        <div class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 mb-6">
          <h2 class="text-xl font-bold mb-8">&#49345;&#54408; &#49688;&#51221;</h2>

          <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">{{ errorMessage }}</div>
          <div v-if="successMessage" class="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-6 text-sm">{{ successMessage }}</div>

          <div class="space-y-6">
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">&#49345;&#54408;&#47749; *</label>
              <input v-model="title" type="text" class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">&#44032;&#44201; (&#50896;) *</label>
                <input v-model.number="price" type="number" min="1" step="1" inputmode="numeric" class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" @wheel="preventNumberScroll" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">&#52572;&#45824; &#51064;&#50896; *</label>
                <input v-model.number="maxCapacity" type="number" min="1" step="1" inputmode="numeric" class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" @wheel="preventNumberScroll" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">&#54032;&#47588; &#49345;&#53468;</label>
              <select v-model="status" class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
                <option value="ENABLE">ENABLE</option>
                <option value="DISABLE">DISABLE</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">&#49345;&#54408; &#49444;&#47749;</label>
              <textarea v-model="description" rows="4" class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">&#49345;&#54408; &#51060;&#48120;&#51648; (&#52572;&#45824; 10&#51109;)</label>
              <div class="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors" @click="$refs.fileInput.click()">
                <svg class="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p class="text-sm text-gray-400 dark:text-gray-500">&#53364;&#47533;&#54644;&#49436; &#51060;&#48120;&#51648; &#54028;&#51068;&#51012; &#49440;&#53469;&#54644; &#51452;&#49464;&#50836;</p>
                <p class="text-xs text-gray-400 dark:text-gray-600 mt-1">JPG, PNG, WEBP</p>
              </div>
              <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFileSelect" />

              <div v-if="previews.length" class="mt-3 grid grid-cols-3 gap-2">
                <div v-for="(preview, index) in previews" :key="preview.fileId" class="relative group">
                  <img :src="preview.url" class="w-full h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
                  <button type="button" class="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" @click="removeImage(preview.fileId)">×</button>
                  <div class="absolute bottom-1 left-1 text-white text-xs px-1.5 py-0.5 rounded font-medium" :class="index === 0 ? 'bg-blue-500/90' : 'bg-black/60'">
                    {{ index === 0 ? '대표' : index + 1 }}
                  </div>
                </div>
              </div>

              <p v-if="uploadStatus" class="mt-2 text-xs" :class="uploading ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'">{{ uploadStatus }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">&#51452;&#49548;</label>
              <div class="flex gap-2">
                <input :value="roadAddress" type="text" readonly placeholder="&#51452;&#49548; &#44160;&#49353; &#48260;&#53948;&#51012; &#45572;&#47476;&#49464;&#50836;" class="flex-1 px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600" />
                <button type="button" class="shrink-0 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" @click="openAddressSearch">&#51452;&#49548; &#44160;&#49353;</button>
              </div>
              <input v-model="detailAddress" type="text" placeholder="&#49345;&#49464; &#51452;&#49548;&#47484; &#51077;&#47141;&#54644; &#51452;&#49464;&#50836;" class="w-full mt-2 px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
              <input :value="zonecode" type="text" readonly placeholder="&#50864;&#54200;&#48264;&#54840;" class="w-full mt-2 px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600" />
              <p v-if="addressStatus" class="mt-2 text-xs" :class="addressStatusIsError ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'">{{ addressStatus }}</p>
            </div>

            <div class="flex gap-3 pt-2">
              <RouterLink to="/seller/products" class="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded-lg text-sm text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">&#52712;&#49548;</RouterLink>
              <button type="button" :disabled="submitting || uploading" class="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-50" @click="submitForm">{{ submitting ? '저장 중...' : '저장하기' }}</button>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold">&#51068;&#51221; &#44288;&#47532;</h2>
            <button type="button" class="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium" @click="addScheduleRow">+ &#51068;&#51221; &#52628;&#44032;</button>
          </div>

          <div v-if="existingSchedules.length" class="space-y-2 mb-6">
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">&#46321;&#47197;&#46108; &#51068;&#51221;</h3>
            <div v-for="schedule in existingSchedules" :key="schedule.id" class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#121212] rounded-lg border border-gray-200 dark:border-gray-800">
              <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span>{{ schedule.scheduleDt }}</span>
                <span>{{ schedule.startTime }} ~ {{ schedule.endTime }}</span>
                <span class="text-xs text-gray-500">{{ SCHEDULE_STATUS[schedule.status] ?? schedule.status }}</span>
              </div>
              <button type="button" :disabled="deletingScheduleId === schedule.id" class="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50 shrink-0" @click="deleteSchedule(schedule.id)">{{ deletingScheduleId === schedule.id ? '삭제 중...' : '삭제' }}</button>
            </div>
          </div>

          <div v-else class="text-sm text-gray-400 dark:text-gray-500 mb-6">&#46321;&#47197;&#46108; &#51068;&#51221;&#51060; &#50630;&#49845;&#45768;&#45796;.</div>

          <div v-if="newSchedules.length" class="space-y-3">
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">&#52628;&#44032;&#54624; &#51068;&#51221;</h3>
            <div v-for="(schedule, index) in newSchedules" :key="index" class="grid grid-cols-1 sm:grid-cols-[1fr_112px_112px_auto_auto] gap-2 items-start">
              <input v-model="schedule.scheduleDt" type="date" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
              <input v-model="schedule.startTime" type="time" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
              <input v-model="schedule.endTime" type="time" class="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
              <button type="button" class="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors" @click="addNewSchedule(schedule)">&#46321;&#47197;</button>
              <button type="button" class="px-3 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-300 rounded-lg text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" @click="removeScheduleRow(index)">&#49325;&#51228;</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
