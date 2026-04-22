<script setup>
import { onMounted, ref, computed } from 'vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { filesApi } from '@/api/files'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { loadDaumPostcode, loadKakaoMaps } from '@/utils/loadKakao'
import { resolveImageUrl } from '@/utils/imageUrl'

const DT_UPLOADED = 'application/x-jabaclass-uploaded-index'

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
  AVAILABLE: '예약 가능',
  FULL: '마감',
  CLOSED: '종료',
  PENDING: '대기중',
}

function normalizePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizePositiveNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function preventNumberScroll(event) { event.target.blur() }

function normalizeStringList(val) {
  if (val == null) return []
  if (Array.isArray(val)) return val.map((x) => (x == null ? '' : String(x)))
  if (typeof val === 'string') return val.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
  return []
}

const UUID_IN_PATH = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function guessFileIdFromStoragePath(path) {
  if (!path || typeof path !== 'string') return ''
  const parts = path.split('/').filter(Boolean)
  if (parts.length >= 2 && UUID_IN_PATH.test(parts[1])) return parts[1]
  return ''
}

function extractProductImageSlots(product) {
  if (!product || typeof product !== 'object') return []
  const nested = product.images ?? product.productImages ?? product.imageList ?? product.product_images
  if (Array.isArray(nested) && nested.length) {
    return nested.map((img) => ({
      fileId: String(img?.fileId ?? img?.file_id ?? img?.imageId ?? img?.image_id ?? img?.id ?? ''),
      rawPath: img?.storagePath ?? img?.storage_path ?? img?.path ?? img?.url ?? '',
    })).filter((row) => row.fileId)
  }
  const ids = normalizeStringList(product.imageIds ?? product.image_ids ?? product.fileIds)
  const paths = normalizeStringList(product.imagePaths ?? product.image_paths)
  const thumb = product.thumbnailPath ?? product.thumbnail_path ?? ''
  if (!ids.length && paths.length) {
    return paths.map((rawPath) => {
      const fileId = guessFileIdFromStoragePath(rawPath)
      return fileId ? { fileId, rawPath } : null
    }).filter(Boolean)
  }
  if (!ids.length) return []
  function pathForFileId(fileId, index) {
    if (paths[index]) return paths[index]
    const hit = paths.find((p) => guessFileIdFromStoragePath(p) === fileId)
    if (hit) return hit
    if (thumb && guessFileIdFromStoragePath(thumb) === fileId) return thumb
    return ''
  }
  return ids.map((fileId, index) => {
    let rawPath = pathForFileId(fileId, index)
    if (!rawPath && thumb && index === 0) rawPath = thumb
    if (!rawPath && thumb && paths.length === 0 && ids.length === 1) rawPath = thumb
    return { fileId, rawPath }
  })
}

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
    price.value = product.price != null ? Number(product.price) : null
    maxCapacity.value = product.maxCapacity != null ? Number(product.maxCapacity) : null
    description.value = product.description ?? ''
    status.value = product.status ?? 'ENABLE'
    roadAddress.value = product.roadAddress ?? ''
    detailAddress.value = product.detailAddress ?? ''
    zonecode.value = product.zonecode ?? ''
    latitude.value = product.latitude != null ? String(product.latitude) : ''
    longitude.value = product.longitude != null ? String(product.longitude) : ''
    const imageSlots = extractProductImageSlots(product)
    imageSlots.forEach(({ fileId, rawPath }) => {
      uploadedFileIds.value.push(fileId)
      previews.value.push({ fileId, url: resolveImageUrl(rawPath) })
    })
  } catch (error) {
    errorMessage.value = error?.response?.data?.message || '상품 정보를 불러오지 못했습니다.'
  } finally { loading.value = false }
})

function getApiErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.error || error?.response?.data?.data?.message || error?.message || fallback
}

function getKakaoLoadMessage(error) {
  if (error?.code === 'KAKAO_KEY_MISSING') return '카카오 JavaScript 키가 없습니다.'
  if (error?.code === 'KAKAO_MAP_LOAD_FAILED') return '카카오 지도 SDK를 불러오지 못했습니다.'
  if (error?.code === 'DAUM_POSTCODE_LOAD_FAILED') return '카카오 주소 검색 스크립트를 불러오지 못했습니다.'
  return '주소 검색 서비스를 불러오지 못했습니다.'
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
  if (toUpload.length === 0) { uploadStatus.value = '이미지는 최대 10개까지 등록할 수 있습니다.'; event.target.value = ''; return }
  uploading.value = true
  uploadStatus.value = `이미지 업로드 중... (0/${toUpload.length})`
  for (let index = 0; index < toUpload.length; index += 1) {
    const file = toUpload[index]
    try {
      const uploadRes = await filesApi.uploadRequest(file.name)
      const { fileId, uploadUrl } = uploadRes.data.data
      await fetch(uploadUrl, { method: 'PUT', body: await file.arrayBuffer() })
      await filesApi.complete(fileId)
      uploadedFileIds.value.push(fileId)
      previews.value.push({ fileId, url: await readAsDataURL(file) })
      uploadStatus.value = `이미지 업로드 중... (${index + 1}/${toUpload.length})`
    } catch { uploadStatus.value = `"${file.name}" 업로드에 실패했습니다.` }
  }
  uploading.value = false
  uploadStatus.value = uploadedFileIds.value.length ? `총 ${uploadedFileIds.value.length}개 이미지가 등록되어 있습니다.` : ''
  event.target.value = ''
}

function removeImage(fileId) {
  uploadedFileIds.value = uploadedFileIds.value.filter((id) => id !== fileId)
  previews.value = previews.value.filter((preview) => preview.fileId !== fileId)
  uploadStatus.value = uploadedFileIds.value.length ? `총 ${uploadedFileIds.value.length}개 이미지가 등록되어 있습니다.` : ''
}

function onUploadedDragStart(index, dragEvent) { dragEvent.dataTransfer.effectAllowed = 'move'; dragEvent.dataTransfer.setData(DT_UPLOADED, String(index)) }
function onUploadedDrop(toIndex, dragEvent) {
  dragEvent.preventDefault()
  const from = Number.parseInt(dragEvent.dataTransfer.getData(DT_UPLOADED), 10)
  if (!Number.isFinite(from) || from === toIndex) return
  const nextPreviews = [...previews.value]; const nextIds = [...uploadedFileIds.value]
  const [row] = nextPreviews.splice(from, 1); const [id] = nextIds.splice(from, 1)
  nextPreviews.splice(toIndex, 0, row); nextIds.splice(toIndex, 0, id)
  previews.value = nextPreviews; uploadedFileIds.value = nextIds
}

async function openAddressSearch() {
  addressStatus.value = ''; addressStatusIsError.value = false
  try {
    const daum = await loadDaumPostcode(); const kakao = await loadKakaoMaps()
    new daum.Postcode({
      oncomplete: (data) => {
        roadAddress.value = data.roadAddress || data.address || ''; zonecode.value = data.zonecode || ''
        const geocoder = new kakao.maps.services.Geocoder()
        geocoder.addressSearch(roadAddress.value, (result, status) => {
          if (status !== kakao.maps.services.Status.OK || !result?.length) {
            latitude.value = ''; longitude.value = ''
            addressStatus.value = '주소는 찾았지만 좌표 변환에 실패했습니다.'; addressStatusIsError.value = true; return
          }
          longitude.value = result[0].x; latitude.value = result[0].y; addressStatus.value = '주소와 좌표를 불러왔습니다.'
        })
      },
    }).open()
  } catch (error) { addressStatus.value = getKakaoLoadMessage(error); addressStatusIsError.value = true; alert(addressStatus.value) }
}

async function deleteSchedule(scheduleId) {
  if (!confirm('이 일정을 삭제하시겠습니까?')) return
  deletingScheduleId.value = scheduleId
  try {
    await productsApi.deleteSchedule(productId, scheduleId)
    existingSchedules.value = existingSchedules.value.filter((schedule) => schedule.id !== scheduleId)
  } catch (error) { alert(getApiErrorMessage(error, '일정 삭제에 실패했습니다.')) }
  finally { deletingScheduleId.value = null }
}

const isDark = computed(() => localStorage.getItem('theme') === 'jaba-dark')

function toDateStr(d) { if (!d) return ''; const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}` }
function toTimeStr(v) { if (!v) return ''; return `${String(v.hours).padStart(2,'0')}:${String(v.minutes).padStart(2,'0')}` }
function toTimeObj(str) { if (!str) return null; const [h, m] = str.split(':'); return { hours: Number(h), minutes: Number(m), seconds: 0 } }

function addScheduleRow() { newSchedules.value.push({ scheduleDt: '', startTime: '', endTime: '', status: 'AVAILABLE' }) }
function removeScheduleRow(index) { newSchedules.value.splice(index, 1) }

async function addNewSchedule(schedule) {
  if (!schedule.scheduleDt || !schedule.startTime || !schedule.endTime) { alert('날짜와 시작 시간, 종료 시간을 모두 입력해 주세요.'); return }
  try {
    const response = await productsApi.createSchedule(productId, { scheduleDt: schedule.scheduleDt, startTime: schedule.startTime, endTime: schedule.endTime, status: schedule.status })
    const created = response.data?.data ?? response.data
    existingSchedules.value.push(created)
    newSchedules.value = newSchedules.value.filter((item) => item !== schedule)
  } catch (error) { alert(getApiErrorMessage(error, '일정 추가에 실패했습니다.')) }
}

async function submitForm() {
  if (uploading.value || submitting.value) return
  errorMessage.value = ''; successMessage.value = ''; submitting.value = true
  try {
    await productsApi.update(productId, {
      title: title.value, maxCapacity: normalizePositiveInteger(maxCapacity.value),
      description: description.value, imageIds: uploadedFileIds.value,
      price: normalizePositiveNumber(price.value), status: status.value,
      roadAddress: roadAddress.value, detailAddress: detailAddress.value,
      zonecode: zonecode.value,
      latitude: latitude.value ? Number(latitude.value) : null,
      longitude: longitude.value ? Number(longitude.value) : null,
    })
    successMessage.value = '상품 정보가 수정되었습니다.'
    setTimeout(() => router.push('/seller/products'), 1200)
  } catch (error) { errorMessage.value = getApiErrorMessage(error, '상품 수정에 실패했습니다.') }
  finally { submitting.value = false }
}
</script>

<template>
  <div class="bg-base-200 min-h-screen">
    <div class="navbar bg-base-100 shadow-sm sticky top-0 z-30 px-4">
      <div class="flex-1">
        <RouterLink to="/seller/products"><img src="/logo.svg" class="h-20" alt="Jaba 클래스" /></RouterLink>
      </div>
      <div class="flex-none"><ThemeToggle /></div>
    </div>

    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div v-if="loading" class="flex justify-center py-24"><span class="loading loading-spinner loading-lg text-primary"></span></div>

      <template v-else>
        <!-- 상품 수정 폼 -->
        <div class="card bg-base-100 shadow-md mb-6">
          <div class="card-body">
            <h2 class="card-title text-xl mb-4">상품 수정</h2>

            <div v-if="errorMessage" role="alert" class="alert alert-error mb-4"><span class="text-sm">{{ errorMessage }}</span></div>
            <div v-if="successMessage" role="alert" class="alert alert-success mb-4"><span class="text-sm">{{ successMessage }}</span></div>

            <div class="space-y-5">
              <div class="form-control">
                <label class="label pb-1"><span class="label-text font-medium">상품명 *</span></label>
                <input v-model="title" type="text" class="input input-bordered w-full" />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="form-control">
                  <label class="label pb-1"><span class="label-text font-medium">가격 (원) *</span></label>
                  <input v-model.number="price" type="number" min="1" step="1" inputmode="numeric" class="input input-bordered w-full" @wheel="preventNumberScroll" />
                </div>
                <div class="form-control">
                  <label class="label pb-1"><span class="label-text font-medium">최대 인원 *</span></label>
                  <input v-model.number="maxCapacity" type="number" min="1" step="1" inputmode="numeric" class="input input-bordered w-full" @wheel="preventNumberScroll" />
                </div>
              </div>

              <div class="form-control">
                <label class="label pb-1"><span class="label-text font-medium">판매 상태</span></label>
                <select v-model="status" class="select select-bordered w-full">
                  <option value="ENABLE">판매중</option>
                  <option value="DISABLE">비활성</option>
                </select>
              </div>

              <div class="form-control">
                <label class="label pb-1"><span class="label-text font-medium">상품 설명</span></label>
                <textarea v-model="description" rows="4" class="textarea textarea-bordered w-full resize-none"></textarea>
              </div>

              <!-- 이미지 -->
              <div class="form-control">
                <label class="label pb-1"><span class="label-text font-medium">상품 이미지 (최대 10장)</span></label>
                <div class="border-2 border-dashed border-base-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors" @click="$refs.fileInput.click()">
                  <svg class="w-10 h-10 mx-auto text-base-content/30 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p class="text-sm text-base-content/50">클릭해서 이미지 파일을 선택해 주세요</p>
                  <p class="text-xs text-base-content/30 mt-1">JPG, PNG, WEBP</p>
                </div>
                <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="handleFileSelect" />

                <div v-if="previews.length" class="mt-3 rounded-xl border border-base-300 bg-base-200/50 p-3">
                  <p class="text-xs text-base-content/50 mb-2 font-medium">드래그로 순서 변경 (맨 앞이 대표 썸네일)</p>
                  <div class="grid grid-cols-3 gap-2">
                    <div v-for="(preview, index) in previews" :key="`${preview.fileId}-${index}`"
                      draggable="true" class="relative group cursor-grab active:cursor-grabbing"
                      @dragstart="onUploadedDragStart(index, $event)" @dragover.prevent @drop="onUploadedDrop(index, $event)">
                      <img v-if="preview.url" :src="preview.url" class="w-full h-20 object-cover rounded-lg border border-base-300" />
                      <div v-else class="w-full h-20 flex items-center justify-center rounded-lg border-2 border-dashed border-base-300 text-xs text-base-content/40">경로 없음</div>
                      <button type="button" class="btn btn-circle btn-xs absolute top-1 right-1 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity border-0" @click="removeImage(preview.fileId)">×</button>
                      <div class="absolute bottom-1 left-1 text-white text-xs px-1.5 py-0.5 rounded font-medium" :class="index === 0 ? 'bg-primary/90' : 'bg-black/60'">{{ index === 0 ? '대표' : index + 1 }}</div>
                    </div>
                  </div>
                </div>
                <p v-if="uploadStatus" class="mt-2 text-xs" :class="uploading ? 'text-primary' : 'text-base-content/50'">{{ uploadStatus }}</p>
              </div>

              <!-- 주소 -->
              <div class="form-control">
                <label class="label pb-1"><span class="label-text font-medium">주소</span></label>
                <div class="join w-full">
                  <input :value="roadAddress" type="text" readonly placeholder="주소 검색 버튼을 눌러주세요" class="input input-bordered join-item flex-1 bg-base-200" />
                  <button type="button" class="btn btn-outline join-item" @click="openAddressSearch">주소 검색</button>
                </div>
                <input v-model="detailAddress" type="text" placeholder="상세 주소를 입력해 주세요" class="input input-bordered w-full mt-2" />
                <input :value="zonecode" type="text" readonly placeholder="우편번호" class="input input-bordered w-full mt-2 bg-base-200" />
                <p v-if="addressStatus" class="mt-2 text-xs" :class="addressStatusIsError ? 'text-error' : 'text-success'">{{ addressStatus }}</p>
              </div>

              <div class="flex gap-3 pt-2">
                <RouterLink to="/seller/products" class="btn btn-outline flex-1">취소</RouterLink>
                <button type="button" :disabled="submitting || uploading" class="btn btn-primary flex-1" @click="submitForm">
                  <span v-if="submitting" class="loading loading-spinner loading-xs"></span>
                  {{ submitting ? '저장 중...' : '저장하기' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 일정 관리 -->
        <div class="card bg-base-100 shadow-md">
          <div class="card-body">
            <div class="flex items-center justify-between mb-4">
              <h2 class="card-title text-xl">일정 관리</h2>
              <button type="button" class="btn btn-primary btn-sm" @click="addScheduleRow">+ 일정 추가</button>
            </div>

            <div v-if="existingSchedules.length" class="space-y-2 mb-4">
              <h3 class="text-sm font-medium text-base-content/50 mb-2">등록된 일정</h3>
              <div v-for="schedule in existingSchedules" :key="schedule.id" class="flex items-center gap-3 p-3 bg-base-200 rounded-xl">
                <div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                  <span class="font-medium">{{ schedule.scheduleDt }}</span>
                  <span class="text-base-content/70">{{ schedule.startTime }} ~ {{ schedule.endTime }}</span>
                  <span class="text-xs text-base-content/50">{{ SCHEDULE_STATUS[schedule.status] ?? schedule.status }}</span>
                </div>
                <button type="button" :disabled="deletingScheduleId === schedule.id" class="btn btn-error btn-xs" @click="deleteSchedule(schedule.id)">
                  {{ deletingScheduleId === schedule.id ? '삭제 중...' : '삭제' }}
                </button>
              </div>
            </div>
            <div v-else class="text-sm text-base-content/40 mb-4">등록된 일정이 없습니다.</div>

            <div v-if="newSchedules.length" class="space-y-3">
              <h3 class="text-sm font-medium text-base-content/50 mb-2">추가할 일정</h3>
              <div v-for="(schedule, index) in newSchedules" :key="index" class="bg-base-200/50 rounded-2xl p-4 space-y-3 border border-base-300/30">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-black text-base-content/40 ml-1">날짜</label>
                    <VueDatePicker
                      :model-value="schedule.scheduleDt || null"
                      @update:model-value="v => schedule.scheduleDt = toDateStr(v)"
                      :enable-time-picker="false"
                      :dark="isDark"
                      locale="ko"
                      format="yyyy-MM-dd"
                      placeholder="날짜 선택"
                      auto-apply
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-black text-base-content/40 ml-1">시작 시간</label>
                    <VueDatePicker
                      :model-value="toTimeObj(schedule.startTime)"
                      @update:model-value="v => schedule.startTime = toTimeStr(v)"
                      time-picker
                      :dark="isDark"
                      locale="ko"
                      format="HH:mm"
                      placeholder="시작 시간"
                      auto-apply
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-black text-base-content/40 ml-1">종료 시간</label>
                    <VueDatePicker
                      :model-value="toTimeObj(schedule.endTime)"
                      @update:model-value="v => schedule.endTime = toTimeStr(v)"
                      time-picker
                      :dark="isDark"
                      locale="ko"
                      format="HH:mm"
                      placeholder="종료 시간"
                      auto-apply
                    />
                  </div>
                </div>
                <div class="flex gap-2 justify-end">
                  <button type="button" class="btn btn-ghost btn-sm rounded-xl text-error/60 hover:text-error hover:bg-error/5" @click="removeScheduleRow(index)">삭제</button>
                  <button type="button" class="btn btn-primary btn-sm rounded-xl px-6 font-black" @click="addNewSchedule(schedule)">등록</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
