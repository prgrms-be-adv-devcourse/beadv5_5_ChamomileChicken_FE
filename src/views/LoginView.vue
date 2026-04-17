<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const error = ref('')
const registeredMsg = route.query.registered === 'true'

const GATEWAY_URL = 'http://localhost:8080'

async function login() {
  error.value = ''
  try {
    const res = await authApi.login(email.value, password.value)
    auth.setToken(res.data?.data?.accessToken ?? res.data?.accessToken)
    auth.fetchUser()
    const redirect = route.query.redirect || '/products'
    router.push(redirect)
  } catch (e) {
    error.value = e.response?.data?.message || '이메일 또는 비밀번호가 올바르지 않습니다.'
  }
}

function loginWithSocial(provider) {
  window.location.href = `${GATEWAY_URL}/oauth2/authorization/${provider}`
}
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen flex items-center justify-center p-4">

    <ThemeToggle class="fixed top-4 right-4 bg-white dark:bg-[#1e1e1e] shadow-sm" />

    <div class="w-full max-w-sm bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-2xl">
      <div class="text-center mb-10">
        <h2 class="text-3xl font-bold tracking-tight">Jaba</h2>
        <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">서비스 이용을 위해 로그인해주세요</p>
      </div>

      <div v-if="registeredMsg"
        class="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-6 text-sm">
        회원가입이 완료되었습니다. 로그인해주세요.
      </div>

      <div v-if="error"
        class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
        {{ error }}
      </div>

      <form @submit.prevent="login" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">이메일</label>
          <input v-model="email" type="email" placeholder="이메일 입력" required
            class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">비밀번호</label>
          <input v-model="password" type="password" placeholder="비밀번호 입력" required
            class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
        </div>
        <button type="submit"
          class="w-full py-3.5 mt-2 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
          로그인
        </button>
      </form>

      <!-- 소셜 로그인 구분선 -->
      <div class="flex items-center my-6">
        <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
        <span class="px-3 text-xs text-gray-400 dark:text-gray-600">또는 소셜 로그인</span>
        <div class="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
      </div>

      <!-- 소셜 로그인 버튼 -->
      <div class="space-y-3">
        <!-- Google -->
        <button @click="loginWithSocial('google')"
          class="w-full flex items-center justify-center gap-3 py-3 bg-white dark:bg-[#2a2a2a] border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#333] transition-colors">
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 로그인
        </button>

        <!-- Kakao -->
        <button @click="loginWithSocial('kakao')"
          class="w-full flex items-center justify-center gap-3 py-3 bg-[#FEE500] hover:bg-[#fada00] border border-[#FEE500] rounded-lg text-sm font-medium text-[#191919] transition-colors">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="#191919">
            <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.61 5.08 4.05 6.53L5.1 21l4.35-2.9c.82.14 1.67.2 2.55.2 5.52 0 10-3.48 10-7.8S17.52 3 12 3z"/>
          </svg>
          카카오로 로그인
        </button>

        <!-- Naver -->
        <button @click="loginWithSocial('naver')"
          class="w-full flex items-center justify-center gap-3 py-3 bg-[#03C75A] hover:bg-[#02b550] border border-[#03C75A] rounded-lg text-sm font-medium text-white transition-colors">
          <span class="w-5 h-5 flex items-center justify-center font-extrabold text-base leading-none">N</span>
          네이버로 로그인
        </button>
      </div>

      <p class="text-center text-sm text-gray-500 mt-6">
        계정이 없으신가요?
        <RouterLink to="/signup" class="text-gray-900 dark:text-white font-medium hover:underline">회원가입</RouterLink>
      </p>
    </div>

  </div>
</template>
