export function resolveImageUrl(path) {
  const S3_BASE_URL = 'https://team04-buket.s3.ap-northeast-2.amazonaws.com'

  if (!path) return ''

  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }

  if (path.startsWith('/')) {
    return encodeURI(path)
  }

  return `${S3_BASE_URL}/${encodeURI(path)}`
}
