<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { filesApi } from '@/api/files'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { loadDaumPostcode, loadKakaoMaps } from '@/utils/loadKakao'

const DT_PENDING = 'application/x-jabaclass-pending-index'
const DT_UPLOADED = 'application/x-jabaclass-uploaded-index'

function createPendingId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const router = useRouter()
const auth = useAuthStore()

const title = ref('')
const price = ref(null)
const maxCapacity = ref(null)
const description = ref('')
const roadAddress = ref('')
const detailAddress = ref('')
const zonecode = ref('')
const latitude = ref('')
const longitude = ref('')

const errorMessage = ref('')
const uploadStatus = ref('')
const addressStatus = ref('')
const addressStatusIsError = ref(false)
const uploading = ref(false)
const submitting = ref(false)

const uploadedFileIds = ref([])
const previews = ref([])
const pendingItems = ref([])

onMounted(async () => {
  if (!auth.user) await auth.fetchUser()
  if (!auth.isSeller) router.push('/products')
})

function normalizePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizePositiveNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function preventNumberScroll(event) { event.target.blur() }

function getApiErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.error || error?.response?.data?.data?.message || error?.message || fallback
}

function getKakaoLoadMessage(error) {
  if (error?.code === 'KAKAO_KEY_MISSING') return '카카오 JavaScript 키가 없습니다. .env.local 설정을 확인해 주세요.'
  if (error?.code === 'KAKAO_MAP_LOAD_FAILED') return '카카오 지도 SDK를 불러오지 못했습니다. 키나 등록한 도메인을 확인해 주세요.'
  if (error?.code === 'DAUM_POSTCODE_LOAD_FAILED') return '카카오 주소 검색 스크립트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
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
  const remaining = 10 - uploadedFileIds.value.length - pendingItems.value.length
  const toQueue = files.slice(0, remaining)
  if (toQueue.length === 0) { uploadStatus.value = '이미지는 최대 10개까지 등록할 수 있습니다.'; event.target.value = ''; return }
  for (const file of toQueue) {
    pendingItems.value.push({ id: createPendingId(), file, dataUrl: await readAsDataURL(file) })
  }
  uploadStatus.value = pendingItems.value.length ? `선택 ${pendingItems.value.length}개 · 순서를 마운 후 아래 "이 순서로 업로드"를 눌러주세요. (첫 번째가 대표 썸네일)` : ''
  event.target.value = ''
}

function removePending(id) {
  pendingItems.value = pendingItems.value.filter((item) => item.id !== id)
  uploadStatus.value = pendingItems.value.length ? `선택 ${pendingItems.value.length}개 · 순서를 마운 후 업로드하세요.` : uploadedFileIds.value.length ? `총 ${uploadedFileIds.value.length}개 이미지가 업로드되었습니다.` : ''
}

function onPendingDragStart(index, dragEvent) { dragEvent.dataTransfer.effectAllowed = 'move'; dragEvent.dataTransfer.setData(DT_PENDING, String(index)) }
function onPendingDrop(toIndex, dragEvent) {
  dragEvent.preventDefault()
  const from = Number.parseInt(dragEvent.dataTransfer.getData(DT_PENDING), 10)
  if (!Number.isFinite(from) || from === toIndex) return
  const next = [...pendingItems.value]
  const [row] = next.splice(from, 1)
  next.splice(toIndex, 0, row)
  pendingItems.value = next
}

function onUploadedDragStart(index, dragEvent) { dragEvent.dataTransfer.effectAllowed = 'move'; dragEvent.dataTransfer.setData(DT_UPLOADED, String(index)) }
function onUploadedDrop(toIndex, dragEvent) {
  dragEvent.preventDefault()
  const from = Number.parseInt(dragEvent.dataTransfer.getData(DT_UPLOADED), 10)
  if (!Number.isFinite(from) || from === toIndex) return
  const nextPreviews = [...previews.value]
  const nextIds = [...uploadedFileIds.value]
  const [row] = nextPreviews.splice(from, 1)
  const [id] = nextIds.splice(from, 1)
  nextPreviews.splice(toIndex, 0, row)
  nextIds.splice(toIndex, 0, id)
  previews.value = nextPreviews
  uploadedFileIds.value = nextIds
}

async function uploadPendingQueue() {
  if (!pendingItems.value.length || uploading.value) return
  uploading.value = true
  const queue = [...pendingItems.value]
  pendingItems.value = []
  try {
    for (let i = 0; i < queue.length; i += 1) {
      const item = queue[i]
      uploadStatus.value = `이미지 업로드 중... (${i + 1}/${queue.length})`
      try {
        const uploadRes = await filesApi.uploadRequest(item.file.name)
        const { fileId, uploadUrl } = uploadRes.data.data
        await fetch(uploadUrl, { method: 'PUT', body: await item.file.arrayBuffer() })
        await filesApi.complete(fileId)
        uploadedFileIds.value.push(fileId)
        previews.value.push({ fileId, dataUrl: item.dataUrl })
      } catch {
        pendingItems.value.push(item)
        for (let j = i + 1; j < queue.length; j += 1) pendingItems.value.push(queue[j])
        uploadStatus.value = `"${item.file.name}" 업로드에 실패했습니다.`
        uploading.value = false
        return
      }
    }
    uploadStatus.value = uploadedFileIds.value.length ? `총 ${uploadedFileIds.value.length}개 이미지가 업로드되었습니다.` : ''
  } finally { uploading.value = false }
}

function removeImage(fileId) {
  uploadedFileIds.value = uploadedFileIds.value.filter((id) => id !== fileId)
  previews.value = previews.value.filter((preview) => preview.fileId !== fileId)
  uploadStatus.value = uploadedFileIds.value.length ? `총 ${uploadedFileIds.value.length}개 이미지가 업로드되었습니다.` : ''
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
            latitude.value = ''; longitude.value = ''
            addressStatus.value = '주소는 찾았지만 좌표 변환에 실패했습니다. 주소를 다시 선택해 주세요.'
            addressStatusIsError.value = true; return
          }
          longitude.value = result[0].x; latitude.value = result[0].y
          addressStatus.value = '주소와 좌표를 불러왔습니다.'
        })
      },
    }).open()
  } catch (error) {
    addressStatus.value = getKakaoLoadMessage(error)
    addressStatusIsError.value = true
    alert(addressStatus.value)
  }
}

async function submitForm() {
  if (uploading.value || submitting.value || pendingItems.value.length) return
  errorMessage.value = ''
  submitting.value = true
  try {
    await productsApi.create({
      sellerId: auth.user?.userId,
      title: title.value,
      maxCapacity: normalizePositiveInteger(maxCapacity.value),
      description: description.value,
      imageIds: uploadedFileIds.value,
      price: normalizePositiveNumber(price.value),
      status: 'ENABLE',
      roadAddress: roadAddress.value,
      detailAddress: detailAddress.value,
      zonecode: zonecode.value,
      latitude: latitude.value ? Number(latitude.value) : null,
      longitude: longitude.value ? Number(longitude.value) : null,
    })
    alert('상품이 등록되었습니다. 이어서 일정과 시간을 등록해 주세요.')
    router.push('/seller/products')
  } catch (error) {
    const message = getApiErrorMessage(error, '상품 등록에 실패했습니다.')
    errorMessage.value = message
    alert(message)
  } finally { submitting.value = false }
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
      <div class="card bg-base-100 shadow-md">
        <div class="card-body">
          <h2 class="card-title text-xl mb-4">상품 등록</h2>

          <div v-if="errorMessage" role="alert" class="alert alert-error mb-4">
            <span class="text-sm">{{ errorMessage }}</span>
          </div>

          <div class="space-y-5">
            <div class="form-control">
              <label class="label pb-1"><span class="label-text font-medium">상품명 *</span></label>
              <input v-model="title" type="text" required placeholder="상품명을 입력해 주세요" class="input input-bordered w-full" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label pb-1"><span class="label-text font-medium">가격 (원) *</span></label>
                <input v-model.number="price" type="number" required min="1" step="1" inputmode="numeric" placeholder="가격을 입력해 주세요" class="input input-bordered w-full" @wheel="preventNumberScroll" />
              </div>
              <div class="form-control">
                <label class="label pb-1"><span class="label-text font-medium">최대 인원 *</span></label>
                <input v-model.number="maxCapacity" type="number" required min="1" step="1" inputmode="numeric" placeholder="최대 인원을 입력해 주세요" class="input input-bordered w-full" @wheel="preventNumberScroll" />
              </div>
            </div>

            <div class="form-control">
              <label class="label pb-1"><span class="label-text font-medium">상품 설명</span></label>
              <textarea v-model="description" rows="4" placeholder="상품에 대한 설명을 입력해 주세요" class="textarea textarea-bordered w-full resize-none"></textarea>
            </div>

            <!-- 이미지 업로드 -->
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

              <div v-if="pendingItems.length" class="mt-3 rounded-xl border border-warning/40 bg-warning/5 p-3">
                <p class="text-xs text-warning font-medium mb-2">업로드 대기 · 드래그로 순서 변경 (맨 앞이 대표 썸네일)</p>
                <div class="grid grid-cols-3 gap-2">
                  <div v-for="(item, index) in pendingItems" :key="item.id"
                    draggable="true" class="relative group cursor-grab active:cursor-grabbing"
                    @dragstart="onPendingDragStart(index, $event)" @dragover.prevent @drop="onPendingDrop(index, $event)">
                    <img :src="item.dataUrl" class="w-full h-20 object-cover rounded-lg border border-warning/40" />
                    <button type="button" class="btn btn-circle btn-xs absolute top-1 right-1 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity border-0" @click="removePending(item.id)">×</button>
                    <div class="absolute bottom-1 left-1 text-white text-xs px-1.5 py-0.5 rounded font-medium" :class="index === 0 ? 'bg-primary/90' : 'bg-black/60'">
                      {{ index === 0 ? '대표' : index + 1 }}
                    </div>
                  </div>
                </div>
                <button type="button" :disabled="uploading" class="btn btn-warning btn-sm w-full mt-3" @click="uploadPendingQueue">
                  <span v-if="uploading" class="loading loading-spinner loading-xs"></span>
                  {{ uploading ? '업로드 중...' : '이 순서로 업로드' }}
                </button>
              </div>

              <div v-if="previews.length" class="mt-3 rounded-xl border border-base-300 bg-base-200/50 p-3">
                <p class="text-xs text-base-content/50 mb-2 font-medium">업로드됨 · 드래그로 순서 변경 (맨 앞이 대표 썸네일)</p>
                <div class="grid grid-cols-3 gap-2">
                  <div v-for="(preview, index) in previews" :key="`${preview.fileId}-${index}`"
                    draggable="true" class="relative group cursor-grab active:cursor-grabbing"
                    @dragstart="onUploadedDragStart(index, $event)" @dragover.prevent @drop="onUploadedDrop(index, $event)">
                    <img :src="preview.dataUrl" class="w-full h-20 object-cover rounded-lg border border-base-300" />
                    <button type="button" class="btn btn-circle btn-xs absolute top-1 right-1 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity border-0" @click="removeImage(preview.fileId)">×</button>
                    <div class="absolute bottom-1 left-1 text-white text-xs px-1.5 py-0.5 rounded font-medium" :class="index === 0 ? 'bg-primary/90' : 'bg-black/60'">
                      {{ index === 0 ? '대표' : index + 1 }}
                    </div>
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

            <div role="alert" class="alert alert-info py-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span class="text-sm">일정 등록은 상품 저장 후 수정 화면에서 진행합니다.</span>
            </div>

            <div class="flex gap-3 pt-2">
              <RouterLink to="/seller/products" class="btn btn-outline flex-1">취소</RouterLink>
              <button type="button" :disabled="submitting || uploading || pendingItems.length > 0" class="btn btn-primary flex-1" @click="submitForm">
                <span v-if="submitting" class="loading loading-spinner loading-xs"></span>
                {{ submitting ? '등록 중...' : '등록하기' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>