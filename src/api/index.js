import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const api = axios.create({
  baseURL: '/api/v1',
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

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const auth = useAuthStore()
    const originalRequest = error.config

    // 401/403이고, 토큰이 있고, 아직 재시도 안 한 경우에만 reissue 시도
    // _skipReissue 플래그가 있으면 건너뜀 (fetchUser 등 실패해도 괜찮은 요청)
    if (
      [401, 403].includes(error.response?.status) &&
      auth.accessToken &&
      !originalRequest._retry &&
      !isRefreshing &&
      !originalRequest._skipReissue
    ) {
      originalRequest._retry = true
      isRefreshing = true
      try {
        const res = await axios.post('/api/v1/auth/reissue', {}, { withCredentials: true })
        const newToken = res.data?.data?.accessToken ?? res.data?.accessToken ?? res.data?.data?.access_token ?? res.data?.access_token
        if (newToken) {
          auth.setToken(newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          isRefreshing = false
          return axios(originalRequest)
        }
      } catch {
        auth.clearToken()
        isRefreshing = false
        router.push({ name: 'Login' })
      }
      isRefreshing = false
    }

    return Promise.reject(error)
  }
)

export default api
