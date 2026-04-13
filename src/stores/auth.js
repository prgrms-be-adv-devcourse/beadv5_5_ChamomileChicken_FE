import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/index'

export const useAuthStore = defineStore('auth', () => {
  const rawToken = localStorage.getItem('access_token')
  const accessToken = ref(rawToken && rawToken !== 'undefined' ? rawToken : null)
  const rawUser = localStorage.getItem('user')
  const user = ref(rawUser && rawUser !== 'undefined' && rawUser !== 'null' ? JSON.parse(rawUser) : null)

  const isLoggedIn = computed(() => !!accessToken.value)
  const isSeller = computed(() => user.value?.role === 'SELLER')

  function setToken(token) {
    if (!token || token === 'undefined') return
    accessToken.value = token
    localStorage.setItem('access_token', token)
  }

  function clearToken() {
    accessToken.value = null
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  }

  async function fetchUser() {
    try {
      const res = await api.get('/users/me', { _skipReissue: true })
      user.value = res.data?.data ?? res.data
      localStorage.setItem('user', JSON.stringify(user.value))
    } catch {
      // 토큰 만료 등으로 유저 정보 못 가져올 경우 조용히 실패
    }
  }

  return { accessToken, user, isLoggedIn, isSeller, setToken, clearToken, fetchUser }
})
