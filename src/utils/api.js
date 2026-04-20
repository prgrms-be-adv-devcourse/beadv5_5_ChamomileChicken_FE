export function extractApiData(response) {
  return response?.data?.data ?? response?.data
}

export function extractApiMessage(error, fallback = '요청 처리 중 오류가 발생했습니다.') {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.data?.message ||
    error?.message ||
    fallback
  )
}
