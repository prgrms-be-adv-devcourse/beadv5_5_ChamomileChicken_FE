const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const DEFAULT_MAX_IMAGE_SIZE_MB = 10

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)}MB`
}

export function validateImageFiles(files, options = {}) {
  const maxImageSizeBytes = (options.maxImageSizeMb ?? DEFAULT_MAX_IMAGE_SIZE_MB) * 1024 * 1024
  const validFiles = []
  const errors = []

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      errors.push(`"${file.name}"은 JPG/PNG/WEBP만 업로드할 수 있습니다.`)
      continue
    }
    if (file.size > maxImageSizeBytes) {
      errors.push(`"${file.name}"이 용량 제한(${options.maxImageSizeMb ?? DEFAULT_MAX_IMAGE_SIZE_MB}MB)을 초과했습니다. (${formatSize(file.size)})`)
      continue
    }
    validFiles.push(file)
  }

  return { validFiles, errors }
}

export const IMAGE_RATIO_OPTIONS = [
  { label: '1:1', value: '1:1', width: 1, height: 1 },
  { label: '3:4', value: '3:4', width: 3, height: 4 },
  { label: '4:3', value: '4:3', width: 4, height: 3 },
]
