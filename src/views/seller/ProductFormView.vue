<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { productsApi } from '@/api/products'
import { filesApi } from '@/api/files'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { loadDaumPostcode, loadKakaoMaps } from '@/utils/loadKakao'

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

function preventNumberScroll(event) {
  event.target.blur()
}

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
      previews.value.push({ fileId, dataUrl: await readAsDataURL(file) })
      uploadStatus.value = `\uC774\uBBF8\uC9C0 \uC5C5\uB85C\uB4DC \uC911... (${index + 1}/${toUpload.length})`
    } catch {
      uploadStatus.value = `"${file.name}" \uC5C5\uB85C\uB4DC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.`
    }
  }

  uploading.value = false
  uploadStatus.value = uploadedFileIds.value.length ? `\uCD1D ${uploadedFileIds.value.length}\uAC1C \uC774\uBBF8\uC9C0\uAC00 \uC5C5\uB85C\uB4DC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.` : ''
  event.target.value = ''
}

function removeImage(fileId) {
  uploadedFileIds.value = uploadedFileIds.value.filter((id) => id !== fileId)
  previews.value = previews.value.filter((preview) => preview.fileId !== fileId)
  uploadStatus.value = uploadedFileIds.value.length ? `\uCD1D ${uploadedFileIds.value.length}\uAC1C \uC774\uBBF8\uC9C0\uAC00 \uC5C5\uB85C\uB4DC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.` : ''
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

async function submitForm() {
  if (uploading.value || submitting.value) return
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

    alert('\uC0C1\uD488\uC774 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC774\uC5B4\uC11C \uC77C\uC815\uACFC \uC2DC\uAC04\uC744 \uB4F1\uB85D\uD574 \uC8FC\uC138\uC694.')
    router.push('/seller/products')
  } catch (error) {
    const message = getApiErrorMessage(error, '\uC0C1\uD488 \uB4F1\uB85D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.')
    errorMessage.value = message
    alert(message)
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

      <div class="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8">
        <h2 class="text-xl font-bold mb-8">&#49345;&#54408; &#46321;&#47197;</h2>

        <div v-if="errorMessage" class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
          {{ errorMessage }}
        </div>

        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">&#49345;&#54408;&#47749; *</label>
            <input v-model="title" type="text" required placeholder="&#49345;&#54408;&#47749;&#51012; &#51077;&#47141;&#54644; &#51452;&#49464;&#50836;" class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">&#44032;&#44201; (&#50896;) *</label>
              <input v-model.number="price" type="number" required min="1" step="1" inputmode="numeric" placeholder="&#44032;&#44201;&#51012; &#51077;&#47141;&#54644; &#51452;&#49464;&#50836;" class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" @wheel="preventNumberScroll" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">&#52572;&#45824; &#51064;&#50896; *</label>
              <input v-model.number="maxCapacity" type="number" required min="1" step="1" inputmode="numeric" placeholder="&#52572;&#45824; &#51064;&#50896;&#51012; &#51077;&#47141;&#54644; &#51452;&#49464;&#50836;" class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" @wheel="preventNumberScroll" />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">&#49345;&#54408; &#49444;&#47749;</label>
            <textarea v-model="description" rows="4" placeholder="&#49345;&#54408;&#50640; &#45824;&#54620; &#49444;&#47749;&#51012; &#51077;&#47141;&#54644; &#51452;&#49464;&#50836;" class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"></textarea>
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
                <img :src="preview.dataUrl" class="w-full h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
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

          <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#121212] px-4 py-3">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-200">&#51068;&#51221; &#46321;&#47197;&#51008; &#49345;&#54408; &#51200;&#51109; &#54980; &#49688;&#51221; &#54868;&#47732;&#50640;&#49436; &#51652;&#54665;&#46121;&#45768;&#45796;.</p>
          </div>

          <div class="flex gap-3 pt-2">
            <RouterLink to="/seller/products" class="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded-lg text-sm text-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">&#52712;&#49548;</RouterLink>
            <button type="button" :disabled="submitting || uploading" class="flex-1 py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors disabled:opacity-50" @click="submitForm">{{ submitting ? '등록 중...' : '등록하기' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
