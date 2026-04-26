const S3_BASE_URL = window.__APP_CONFIG__?.VITE_S3_BASE_URL || import.meta.env.VITE_S3_BASE_URL

export function resolveImageUrl(path) {
  if (!path) return ''

  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }

  if (path.startsWith('/')) {
    return encodeURI(path)
  }

  return `${S3_BASE_URL}/${encodeURI(path)}`
}
