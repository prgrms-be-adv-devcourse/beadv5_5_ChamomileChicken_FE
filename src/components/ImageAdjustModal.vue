<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { IMAGE_RATIO_OPTIONS } from '@/utils/imageUpload'

const props = defineProps({
  open: { type: Boolean, default: false },
  files: { type: Array, default: () => [] },
})

const emit = defineEmits(['cancel', 'confirm'])

const entries = ref([])
const currentIndex = ref(0)
const viewportRef = ref(null)
const isRendering = ref(false)

const dragState = ref({
  active: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  baseOffsetX: 0,
  baseOffsetY: 0,
})

const currentEntry = computed(() => entries.value[currentIndex.value] ?? null)
const progressText = computed(() => `${currentIndex.value + 1} / ${entries.value.length || 1}`)
const currentRatio = computed(() => IMAGE_RATIO_OPTIONS.find((item) => item.value === currentEntry.value?.ratio) ?? IMAGE_RATIO_OPTIONS[0])
const canGoPrev = computed(() => currentIndex.value > 0)
const canGoNext = computed(() => currentIndex.value < entries.value.length - 1)

function readAsDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (event) => resolve(event.target?.result || '')
    reader.readAsDataURL(file)
  })
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })
}

async function buildEntries(files) {
  const rows = []
  for (const file of files) {
    const dataUrl = await readAsDataURL(file)
    const image = await loadImageFromDataUrl(dataUrl)
    rows.push({
      file,
      dataUrl,
      image,
      ratio: '1:1',
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    })
  }
  entries.value = rows
  currentIndex.value = 0
  await nextTick()
  clampCurrentOffset()
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await buildEntries(props.files)
    } else {
      entries.value = []
      currentIndex.value = 0
    }
  },
)

watch(
  () => [currentEntry.value?.ratio, currentEntry.value?.zoom, currentIndex.value],
  async () => {
    await nextTick()
    clampCurrentOffset()
  },
)

function getViewportSize() {
  const rect = viewportRef.value?.getBoundingClientRect()
  if (!rect) return { width: 1, height: 1 }
  return { width: Math.max(rect.width, 1), height: Math.max(rect.height, 1) }
}

function getDisplayScale(entry) {
  if (!entry?.image) return 1
  const viewport = getViewportSize()
  const coverScale = Math.max(viewport.width / entry.image.naturalWidth, viewport.height / entry.image.naturalHeight)
  return coverScale * entry.zoom
}

function getOffsetLimit(entry) {
  if (!entry?.image) return { x: 0, y: 0 }
  const viewport = getViewportSize()
  const scale = getDisplayScale(entry)
  const renderedWidth = entry.image.naturalWidth * scale
  const renderedHeight = entry.image.naturalHeight * scale
  return {
    x: Math.max((renderedWidth - viewport.width) / 2, 0),
    y: Math.max((renderedHeight - viewport.height) / 2, 0),
  }
}

function clampCurrentOffset() {
  const entry = currentEntry.value
  if (!entry) return
  const limit = getOffsetLimit(entry)
  entry.offsetX = Math.min(Math.max(entry.offsetX, -limit.x), limit.x)
  entry.offsetY = Math.min(Math.max(entry.offsetY, -limit.y), limit.y)
}

function setRatio(value) {
  if (!currentEntry.value) return
  currentEntry.value.ratio = value
  currentEntry.value.zoom = 1
  currentEntry.value.offsetX = 0
  currentEntry.value.offsetY = 0
}

function resetCurrent() {
  if (!currentEntry.value) return
  currentEntry.value.zoom = 1
  currentEntry.value.offsetX = 0
  currentEntry.value.offsetY = 0
}

function onPointerDown(event) {
  if (!currentEntry.value || !viewportRef.value) return
  dragState.value.active = true
  dragState.value.pointerId = event.pointerId
  dragState.value.startX = event.clientX
  dragState.value.startY = event.clientY
  dragState.value.baseOffsetX = currentEntry.value.offsetX
  dragState.value.baseOffsetY = currentEntry.value.offsetY
  viewportRef.value.setPointerCapture(event.pointerId)
}

function onPointerMove(event) {
  if (!dragState.value.active || dragState.value.pointerId !== event.pointerId || !currentEntry.value) return
  const dx = event.clientX - dragState.value.startX
  const dy = event.clientY - dragState.value.startY
  currentEntry.value.offsetX = dragState.value.baseOffsetX + dx
  currentEntry.value.offsetY = dragState.value.baseOffsetY + dy
  clampCurrentOffset()
}

function onPointerUp(event) {
  if (dragState.value.pointerId !== event.pointerId) return
  dragState.value.active = false
  dragState.value.pointerId = null
}

function changeZoomByWheel(event) {
  if (!currentEntry.value) return
  event.preventDefault()
  const delta = event.deltaY > 0 ? -0.08 : 0.08
  currentEntry.value.zoom = Math.min(4, Math.max(1, Number((currentEntry.value.zoom + delta).toFixed(2))))
  clampCurrentOffset()
}

function prev() {
  if (!canGoPrev.value) return
  currentIndex.value -= 1
}

function next() {
  if (!canGoNext.value) return
  currentIndex.value += 1
}

function getExportSize(ratioValue) {
  if (ratioValue === '3:4') return { width: 900, height: 1200 }
  if (ratioValue === '4:3') return { width: 1200, height: 900 }
  return { width: 1200, height: 1200 }
}

function clampSourceRect(value, max, size) {
  if (max <= size) return 0
  return Math.min(Math.max(value, 0), max - size)
}

function blobFromCanvas(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('이미지 변환에 실패했습니다.'))
        return
      }
      resolve(blob)
    }, type, 0.92)
  })
}

async function exportEntry(entry) {
  const viewport = getViewportSize()
  const exportSize = getExportSize(entry.ratio)
  const scale = getDisplayScale(entry)
  const centerX = viewport.width / 2 + entry.offsetX
  const centerY = viewport.height / 2 + entry.offsetY
  const srcWidth = viewport.width / scale
  const srcHeight = viewport.height / scale
  let srcX = (0 - centerX) / scale + entry.image.naturalWidth / 2
  let srcY = (0 - centerY) / scale + entry.image.naturalHeight / 2

  srcX = clampSourceRect(srcX, entry.image.naturalWidth, srcWidth)
  srcY = clampSourceRect(srcY, entry.image.naturalHeight, srcHeight)

  const canvas = document.createElement('canvas')
  canvas.width = exportSize.width
  canvas.height = exportSize.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('이미지 캔버스를 초기화할 수 없습니다.')
  ctx.drawImage(entry.image, srcX, srcY, srcWidth, srcHeight, 0, 0, exportSize.width, exportSize.height)

  const type = entry.file.type || 'image/jpeg'
  const blob = await blobFromCanvas(canvas, type)
  const dataUrl = await readAsDataURL(blob)
  const file = new File([blob], entry.file.name, { type, lastModified: Date.now() })
  return { file, dataUrl }
}

async function confirmAdjustments() {
  if (!entries.value.length || isRendering.value) return
  isRendering.value = true
  try {
    const processed = []
    for (const entry of entries.value) {
      processed.push(await exportEntry(entry))
    }
    emit('confirm', processed)
  } finally {
    isRendering.value = false
  }
}

function cancel() {
  emit('cancel')
}

onBeforeUnmount(() => {
  dragState.value.active = false
  dragState.value.pointerId = null
})
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-[999] bg-black/55 flex items-center justify-center p-4" @keydown.esc="cancel">
    <div class="w-full max-w-3xl bg-base-100 rounded-2xl shadow-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-base-300 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold">이미지 비율/위치 조정</h3>
          <p class="text-sm text-base-content/50">드래그로 위치 이동, 휠/트랙패드로 확대·축소</p>
        </div>
        <span class="badge badge-outline">{{ progressText }}</span>
      </div>

      <div class="p-5 space-y-4">
        <div class="flex gap-2">
          <button
            v-for="ratio in IMAGE_RATIO_OPTIONS"
            :key="ratio.value"
            type="button"
            class="btn btn-sm"
            :class="currentEntry?.ratio === ratio.value ? 'btn-primary' : 'btn-ghost'"
            @click="setRatio(ratio.value)"
          >
            {{ ratio.label }}
          </button>
          <button type="button" class="btn btn-ghost btn-sm ml-auto" @click="resetCurrent">초기화</button>
        </div>

        <div
          ref="viewportRef"
          class="relative w-full max-h-[58vh] mx-auto overflow-hidden rounded-xl bg-base-200 touch-none"
          :style="{ aspectRatio: `${currentRatio.width} / ${currentRatio.height}` }"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel="changeZoomByWheel"
        >
          <img
            v-if="currentEntry"
            :src="currentEntry.dataUrl"
            alt="이미지 조정 미리보기"
            class="absolute select-none pointer-events-none"
            :style="{
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${currentEntry.offsetX}px), calc(-50% + ${currentEntry.offsetY}px)) scale(${getDisplayScale(currentEntry)})`,
              transformOrigin: 'center center',
              width: 'auto',
              height: 'auto',
              maxWidth: 'none',
              maxHeight: 'none',
            }"
          />
        </div>

        <div class="form-control">
          <label class="label py-1"><span class="label-text text-xs text-base-content/50">확대 배율</span></label>
          <input
            v-if="currentEntry"
            v-model.number="currentEntry.zoom"
            type="range"
            min="1"
            max="4"
            step="0.01"
            class="range range-primary range-sm"
            @input="clampCurrentOffset"
          />
        </div>
      </div>

      <div class="px-5 py-4 border-t border-base-300 flex items-center gap-2">
        <button type="button" class="btn btn-ghost" @click="cancel">취소</button>
        <button type="button" class="btn btn-outline" :disabled="!canGoPrev" @click="prev">이전 이미지</button>
        <button type="button" class="btn btn-outline" :disabled="!canGoNext" @click="next">다음 이미지</button>
        <button type="button" class="btn btn-primary ml-auto" :disabled="isRendering" @click="confirmAdjustments">
          <span v-if="isRendering" class="loading loading-spinner loading-xs"></span>
          {{ isRendering ? '처리 중...' : '이 설정으로 적용' }}
        </button>
      </div>
    </div>
  </div>
</template>
