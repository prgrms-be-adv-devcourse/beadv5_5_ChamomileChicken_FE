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

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const auth = useAuthStore()
    if (error.response?.status === 401) {
      try {
        const res = await axios.post('/api/v1/auth/reissue', {}, { withCredentials: true })
        const newToken = res.data?.data?.access_token
        if (newToken) {
          auth.setToken(newToken)
          error.config.headers.Authorization = `Bearer ${newToken}`
          return axios(error.config)
        }
      } catch {
        auth.clearToken()
        router.push({ name: 'Login' })
      }
    }
    return Promise.reject(error)
  }
)

export default api
