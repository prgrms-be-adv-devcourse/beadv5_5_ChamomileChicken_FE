<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { emailApi } from '@/api/email'
import { usersApi } from '@/api/users'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()

const email = ref('')
const code = ref('')
const name = ref('')
const password = ref('')
const phone = ref('')
const verifiedToken = ref('')

const error = ref('')
const success = ref('')
const showCodeSection = ref(false)
const showRegisterSection = ref(false)
const emailDisabled = ref(false)
const sendBtnText = ref('인증번호 발송')
const sendBtnDisabled = ref(false)

function showError(msg) { error.value = msg; success.value = '' }
function showSuccess(msg) { success.value = msg; error.value = '' }

async function sendCode() {
  if (!email.value) { showError('이메일을 입력해주세요.'); return }
  sendBtnDisabled.value = true
  sendBtnText.value = '발송 중...'
  try {
    await emailApi.sendCode(email.value)
    showSuccess('인증번호가 이메일로 발송되었습니다.')
    showCodeSection.value = true
    sendBtnText.value = '재발송'
  } catch (e) {
    showError(e.response?.data?.message || '인증번호 발송에 실패했습니다.')
    sendBtnText.value = '인증번호 발송'
  } finally {
    sendBtnDisabled.value = false
  }
}

async function verifyCode() {
  if (!code.value) { showError('인증번호를 입력해주세요.'); return }
  try {
    const res = await emailApi.verifyCode(email.value, code.value)
    // 응답이 ApiResponseDto로 래핑된 경우와 그렇지 않은 경우 모두 대응
    verifiedToken.value = res.data?.data?.verifiedToken ?? res.data?.verifiedToken
    showSuccess('이메일 인증이 완료되었습니다.')
    showCodeSection.value = false
    emailDisabled.value = true
    sendBtnDisabled.value = true
    showRegisterSection.value = true
  } catch (e) {
    showError(e.response?.data?.message || '인증에 실패했습니다.')
  }
}

async function register() {
  if (!name.value || !password.value || !phone.value) {
    showError('모든 항목을 입력해주세요.'); return
  }
  try {
    await usersApi.register(name.value, email.value, password.value, phone.value, verifiedToken.value)
    router.push('/login?registered=true')
  } catch (e) {
    showError(e.response?.data?.message || '회원가입에 실패했습니다.')
  }
}
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white antialiased min-h-screen flex items-center justify-center p-4">

    <ThemeToggle class="fixed top-4 right-4 bg-white dark:bg-[#1e1e1e] shadow-sm" />

    <div class="w-full max-w-sm bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-2xl">
      <div class="text-center mb-8">
        <h2 class="text-3xl font-bold tracking-tight">Jaba</h2>
        <p class="text-sm text-gray-500 mt-2">회원가입</p>
      </div>

      <div v-if="error"
        class="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">
        {{ error }}
      </div>
      <div v-if="success"
        class="bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-5 text-sm">
        {{ success }}
      </div>

      <div class="space-y-5">
        <!-- 이메일 + 인증번호 발송 -->
        <div>
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">이메일</label>
          <div class="flex gap-2">
            <input v-model="email" type="email" placeholder="이메일 입력" :disabled="emailDisabled"
              class="flex-1 px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors disabled:opacity-50" />
            <button @click="sendCode" :disabled="sendBtnDisabled"
              class="px-3 py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-xs hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors whitespace-nowrap disabled:opacity-50">
              {{ sendBtnText }}
            </button>
          </div>
        </div>

        <!-- 인증번호 확인 -->
        <div v-if="showCodeSection">
          <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">인증번호</label>
          <div class="flex gap-2">
            <input v-model="code" type="text" placeholder="인증번호 입력" maxlength="6"
              class="flex-1 px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            <button @click="verifyCode"
              class="px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-xs hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors whitespace-nowrap">
              인증하기
            </button>
          </div>
        </div>

        <!-- 나머지 정보 -->
        <div v-if="showRegisterSection" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">이름</label>
            <input v-model="name" type="text" placeholder="이름 입력"
              class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">비밀번호</label>
            <input v-model="password" type="password" placeholder="비밀번호 입력"
              class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">전화번호</label>
            <input v-model="phone" type="tel" placeholder="전화번호 입력 (예: 01012345678)"
              class="w-full px-4 py-3 bg-gray-50 dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
          </div>
          <button @click="register"
            class="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-lg text-sm hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
            회원가입
          </button>
        </div>
      </div>

      <p class="text-center text-sm text-gray-500 mt-6">
        이미 계정이 있으신가요?
        <RouterLink to="/login" class="text-gray-900 dark:text-white font-medium hover:underline">로그인</RouterLink>
      </p>
    </div>

  </div>
</template>
