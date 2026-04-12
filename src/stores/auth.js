import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem('access_token') || null)
  const user = ref(null)

  const isLoggedIn = computed(() => !!accessToken.value)

  function setToken(token) {
    accessToken.value = token
    localStorage.setItem('access_token', token)
  }

  function clearToken() {
    accessToken.value = null
    user.value = null
    localStorage.removeItem('access_token')
  }

  return { accessToken, user, isLoggedIn, setToken, clearToken }
})
