import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const gatewayUrl = window.__APP_CONFIG__?.GATEWAY_SERVICE_URL?.replace(/\/+$/, '') || ''
const apiBaseUrl = gatewayUrl ? `${gatewayUrl}/api/v1` : '/api/v1'

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})

let isRefreshing = false
let pendingQueue = []

function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token)
  })
  pendingQueue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const auth = useAuthStore()
    const originalRequest = error.config

    // 403은 RBAC 실패이므로 reissue 불필요, 401만 처리
    // _skipReissue 플래그가 있으면 건너뜀 (fetchUser 등 실패해도 괜찮은 요청)
    if (
      error.response?.status === 401 &&
      auth.accessToken &&
      !originalRequest._retry &&
      !originalRequest._skipReissue
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const res = await axios.post(`${apiBaseUrl}/auth/reissue`, {}, { withCredentials: true })
        const newToken =
          res.data?.data?.accessToken ?? res.data?.accessToken ??
          res.data?.data?.access_token ?? res.data?.access_token

        if (newToken) {
          auth.setToken(newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          processQueue(null, newToken)
          return api(originalRequest)
        }

        // 토큰이 응답에 없는 경우
        const tokenMissingError = new Error('토큰 재발급 응답에 토큰이 없습니다.')
        processQueue(tokenMissingError)
        auth.clearToken()
        router.push({ name: 'Login' })
      } catch (err) {
        processQueue(err)
        auth.clearToken()
        router.push({ name: 'Login' })
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

export default api
