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

async function login() {
  error.value = ''
  try {
    const res = await authApi.login(email.value, password.value)
    auth.setToken(res.data?.data?.accessToken ?? res.data?.accessToken)
    auth.fetchUser() // 논블로킹: 실패해도 로그인 흐름 유지
    const redirect = route.query.redirect || '/products'
    router.push(redirect)
  } catch (e) {
    error.value = e.response?.data?.message || '이메일 또는 비밀번호가 올바르지 않습니다.'
  }
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

      <p class="text-center text-sm text-gray-500 mt-6">
        계정이 없으신가요?
        <RouterLink to="/signup" class="text-gray-900 dark:text-white font-medium hover:underline">회원가입</RouterLink>
      </p>
    </div>

  </div>
</template>
