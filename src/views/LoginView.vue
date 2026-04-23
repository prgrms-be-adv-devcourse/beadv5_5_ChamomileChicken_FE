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
const emailError = ref('')
const passwordError = ref('')
const registeredMsg = route.query.registered === 'true'
const gatewayUrl = window.__APP_CONFIG__?.GATEWAY_SERVICE_URL?.replace(/\/+$/, '') || ''

function validateEmail(val) {
  if (!val) return '이메일을 입력해주세요.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return '올바른 이메일 형식이 아닙니다.'
  return ''
}
function validatePassword(val) {
  if (!val) return '비밀번호를 입력해주세요.'
  return ''
}

async function login() {
  emailError.value = validateEmail(email.value)
  passwordError.value = validatePassword(password.value)
  if (emailError.value || passwordError.value) return
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
  const oauthPath = `/oauth2/authorization/${provider}`
  window.location.href = gatewayUrl ? `${gatewayUrl}${oauthPath}` : oauthPath
}
</script>

<template>
  <div class="hero min-h-screen bg-base-200">
    <ThemeToggle class="fixed top-6 right-6 z-10" />

    <div class="hero-content w-full max-w-[440px] p-4">
      <div class="card w-full bg-base-100 shadow-sm border border-base-300/30 rounded-[40px] overflow-hidden animate-in fade-in zoom-in duration-500">
        <div class="card-body p-8 lg:p-12">
          <div class="text-center mb-10">
            <RouterLink to="/products">
              <img src="/logo.svg" class="h-14 lg:h-16 mx-auto mb-6 hover:scale-105 transition-transform" alt="Jaba Class" />
            </RouterLink>
            <h1 class="text-2xl font-black text-base-content tracking-tight">반가워요! 👋</h1>
            <p class="text-base-content/40 mt-2 font-bold">서비스 이용을 위해 로그인해주세요</p>
          </div>

          <div v-if="registeredMsg || error" class="space-y-4 mb-8">
            <div v-if="registeredMsg" class="alert bg-success/10 border-none text-success py-4 rounded-2xl animate-in slide-in-from-top-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span class="text-sm font-black">회원가입 완료! 로그인 해주세요.</span>
            </div>

            <div v-if="error" class="alert bg-error/10 border-none text-error py-4 rounded-2xl animate-shake">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span class="text-sm font-black">{{ error }}</span>
            </div>
          </div>

          <form @submit.prevent="login" class="flex flex-col gap-4">
            <div class="form-control">
              <input v-model="email" type="text" placeholder="이메일" @input="emailError = ''"
                :key="emailError ? 'email-err' : 'email'"
                :class="emailError ? 'ring-2 ring-error/40 bg-error/5 animate-shake' : 'bg-base-200 focus:bg-white focus:ring-2 focus:ring-primary/20'"
                class="input input-lg border-none rounded-2xl font-bold transition-all h-14" />
              <p v-if="emailError" class="text-error text-xs font-bold mt-2 ml-1 animate-shake">{{ emailError }}</p>
            </div>
            <div class="form-control">
              <input v-model="password" type="password" placeholder="비밀번호" @input="passwordError = ''"
                :key="passwordError ? 'pw-err' : 'pw'"
                :class="passwordError ? 'ring-2 ring-error/40 bg-error/5 animate-shake' : 'bg-base-200 focus:bg-white focus:ring-2 focus:ring-primary/20'"
                class="input input-lg border-none rounded-2xl font-bold transition-all h-14" />
              <p v-if="passwordError" class="text-error text-xs font-bold mt-2 ml-1 animate-shake">{{ passwordError }}</p>
            </div>
            <button type="submit" class="btn btn-primary btn-lg w-full mt-2 rounded-2xl font-black shadow-xl shadow-primary/20 h-14 border-none">
              로그인
            </button>
          </form>

          <div class="divider text-[10px] font-black text-base-content/20 my-8 uppercase tracking-[0.2em]">Social Login</div>

          <div class="flex flex-col gap-3">
            <button @click="loginWithSocial('google')" class="btn bg-white hover:bg-base-200 text-base-content border border-base-300/50 rounded-2xl font-black h-11 text-sm transition-all gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google 로그인
            </button>
            <button @click="loginWithSocial('kakao')" class="btn bg-[#FEE500] text-[#191919] hover:bg-[#FADA00] border-none rounded-2xl font-black h-11 text-sm transition-all gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="#191919">
                <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.61 5.08 4.05 6.53L5.1 21l4.35-2.9c.82.14 1.67.2 2.55.2 5.52 0 10-3.48 10-7.8S17.52 3 12 3z"/>
              </svg>
              카카오 로그인
            </button>
            <button @click="loginWithSocial('naver')" class="btn bg-[#03C75A] text-white hover:bg-[#02b350] border-none rounded-2xl font-black h-11 text-sm transition-all gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="white">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
              </svg>
              네이버 로그인
            </button>
          </div>

          <div class="mt-10 pt-8 border-t border-base-300/30 text-center">
            <p class="text-sm font-bold text-base-content/40">
              아직 계정이 없으신가요?
              <RouterLink to="/signup" class="text-primary hover:underline ml-2">회원가입</RouterLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
