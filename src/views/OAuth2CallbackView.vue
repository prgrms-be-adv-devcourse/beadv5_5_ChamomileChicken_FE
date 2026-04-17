<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

onMounted(async () => {
  // 백엔드가 302 리다이렉트 시 fragment에 accessToken을 담아 보냄
  // 예: http://localhost:3000/oauth2/callback#token=eyJhbGci...
  const hash = window.location.hash.substring(1) // '#' 제거
  const params = new URLSearchParams(hash)
  const token = params.get('token')

  if (token) {
    auth.setToken(token)
    // URL에서 fragment 제거
    window.history.replaceState(null, '', window.location.pathname)
    await auth.fetchUser()
    router.replace('/products')
  } else {
    // 토큰이 없으면 로그인 페이지로
    router.replace({ name: 'Login' })
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212]">
    <div class="text-center">
      <div class="inline-block w-10 h-10 border-4 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white rounded-full animate-spin mb-4"></div>
      <p class="text-sm text-gray-500 dark:text-gray-400">로그인 처리 중...</p>
    </div>
  </div>
</template>
