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

const emailChecked = ref(false)
const emailCheckLoading = ref(false)
const showCodeSection = ref(false)
const showRegisterSection = ref(false)
const emailDisabled = ref(false)
const sendBtnLoading = ref(false)
const sendBtnText = ref('인증번호 발송')

function showError(msg) { error.value = msg; success.value = '' }
function showSuccess(msg) { success.value = msg; error.value = '' }

function onEmailInput() {
  emailChecked.value = false
  showCodeSection.value = false
  error.value = ''
  success.value = ''
  sendBtnText.value = '인증번호 발송'
}

async function checkEmail() {
  if (!email.value) { showError('이메일을 입력해주세요.'); return }
  emailCheckLoading.value = true
  error.value = ''
  success.value = ''
  try {
    await usersApi.emailCheck(email.value)
    emailChecked.value = true
    showSuccess('사용 가능한 이메일입니다.')
  } catch (e) {
    emailChecked.value = false
    showError(e.response?.data?.message || '이미 사용 중인 이메일입니다.')
  } finally {
    emailCheckLoading.value = false
  }
}

async function sendCode() {
  if (!emailChecked.value) { showError('먼저 이메일 중복 확인을 해주세요.'); return }
  sendBtnLoading.value = true
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
    sendBtnLoading.value = false
  }
}

async function verifyCode() {
  if (!code.value) { showError('인증번호를 입력해주세요.'); return }
  try {
    const res = await emailApi.verifyCode(email.value, code.value)
    verifiedToken.value = res.data?.data?.verifiedToken ?? res.data?.verifiedToken
    showSuccess('이메일 인증이 완료되었습니다.')
    showCodeSection.value = false
    emailDisabled.value = true
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
  <div class="hero min-h-screen bg-base-200">
    <ThemeToggle class="fixed top-6 right-6 z-10" />

    <div class="hero-content w-full max-w-[480px] p-4">
      <div class="card w-full bg-base-100 shadow-sm border border-base-300/30 rounded-[40px] overflow-hidden animate-in fade-in zoom-in duration-500">
        <div class="card-body p-8 lg:p-12">
          <div class="text-center mb-10">
            <RouterLink to="/products">
              <img src="/logo.svg" class="h-12 lg:h-14 mx-auto mb-6 hover:scale-105 transition-transform" alt="Jaba Class" />
            </RouterLink>
            <h1 class="text-2xl font-black text-base-content tracking-tight">시작해볼까요? ✨</h1>
            <p class="text-base-content/40 mt-2 font-bold">간편하게 가입하고 클래스를 즐겨보세요</p>
          </div>

          <!-- Alert Messages -->
          <div class="space-y-4 mb-8">
            <div v-if="error" class="alert bg-error/10 border-none text-error py-4 rounded-2xl animate-shake">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span class="text-sm font-black">{{ error }}</span>
            </div>
            <div v-if="success" class="alert bg-success/10 border-none text-success py-4 rounded-2xl animate-in slide-in-from-top-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span class="text-sm font-black">{{ success }}</span>
            </div>
          </div>

          <div class="space-y-6">
            <!-- 1단계: 이메일 + 중복 확인 -->
            <div class="form-control">
              <label class="label pt-0"><span class="label-text text-xs font-black text-base-content/40 ml-1">이메일</span></label>
              <div class="flex gap-2">
                <input v-model="email" @input="onEmailInput" type="email" placeholder="email@example.com" :disabled="emailDisabled"
                  class="input input-lg bg-base-200 border-none focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-2xl font-bold transition-all h-14 flex-1 disabled:opacity-50" />
                <button @click="checkEmail" :disabled="emailCheckLoading || emailDisabled"
                  class="btn btn-lg rounded-2xl px-6 h-14 border-none shadow-sm transition-all active:scale-95"
                  :class="emailChecked ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-base-content text-base-100'">
                  <span v-if="emailCheckLoading" class="loading loading-spinner loading-sm"></span>
                  <span v-else class="font-black">{{ emailChecked ? '확인됨' : '중복확인' }}</span>
                </button>
              </div>
            </div>

            <!-- 2단계: 인증번호 발송 -->
            <transition name="fade">
              <div v-if="emailChecked && !emailDisabled">
                <button @click="sendCode" :disabled="sendBtnLoading"
                  class="btn btn-primary btn-lg w-full rounded-2xl font-black shadow-xl shadow-primary/20 h-14 border-none">
                  {{ sendBtnText }}
                </button>
              </div>
            </transition>

            <!-- 3단계: 인증번호 입력 -->
            <transition name="slide-up">
              <div v-if="showCodeSection" class="form-control">
                <label class="label pt-0"><span class="label-text text-xs font-black text-base-content/40 ml-1">인증번호</span></label>
                <div class="flex gap-2">
                  <input v-model="code" type="text" placeholder="6자리 숫자" maxlength="6"
                    class="input input-lg bg-base-200 border-none focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-2xl font-black text-center tracking-[0.5em] transition-all h-14 flex-1" />
                  <button @click="verifyCode" class="btn bg-base-content text-base-100 rounded-2xl px-6 h-14 border-none font-black transition-all active:scale-95">
                    인증하기
                  </button>
                </div>
              </div>
            </transition>

            <!-- 4단계: 나머지 정보 -->
            <transition name="slide-up">
              <div v-if="showRegisterSection" class="space-y-4 pt-4 border-t border-base-300/30 animate-in fade-in slide-in-from-bottom-4">
                <div class="form-control">
                  <label class="label pt-0"><span class="label-text text-xs font-black text-base-content/40 ml-1">이름</span></label>
                  <input v-model="name" type="text" placeholder="홍길동" 
                    class="input input-lg bg-base-200 border-none focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-2xl font-bold transition-all h-14" />
                </div>
                <div class="form-control">
                  <label class="label pt-0"><span class="label-text text-xs font-black text-base-content/40 ml-1">비밀번호</span></label>
                  <input v-model="password" type="password" placeholder="8자 이상 입력" 
                    class="input input-lg bg-base-200 border-none focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-2xl font-bold transition-all h-14" />
                </div>
                <div class="form-control">
                  <label class="label pt-0"><span class="label-text text-xs font-black text-base-content/40 ml-1">전화번호</span></label>
                  <input v-model="phone" type="tel" placeholder="01012345678" 
                    class="input input-lg bg-base-200 border-none focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-2xl font-bold transition-all h-14" />
                </div>
                <button @click="register" class="btn btn-primary btn-lg w-full mt-4 rounded-2xl font-black shadow-xl shadow-primary/20 h-14 border-none">
                  가입 완료하기
                </button>
              </div>
            </transition>
          </div>

          <div class="mt-10 pt-8 border-t border-base-300/30 text-center">
            <p class="text-sm font-bold text-base-content/40">
              이미 계정이 있으신가요?
              <RouterLink to="/login" class="text-primary hover:underline ml-2">로그인</RouterLink>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active { transition: all 0.4s ease-out; }
.slide-up-enter-from { opacity: 0; transform: translateY(20px); }
</style>
