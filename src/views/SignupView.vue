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
  <div class="min-h-screen bg-base-200 flex items-center justify-center overflow-y-auto py-8">
    <ThemeToggle class="fixed top-6 right-6 z-10" />

    <div class="w-full max-w-[480px] px-4">
      <div class="card w-full bg-base-100 shadow-sm border border-base-300/30 rounded-[40px] overflow-hidden animate-in fade-in zoom-in duration-500">
        <div class="card-body p-6 sm:p-8 lg:p-12">
          <div class="text-center mb-6">
            <RouterLink to="/products">
              <svg width="220" height="50" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg" class="h-12 lg:h-14 w-auto mx-auto mb-6 hover:scale-105 transition-transform">
                <g transform="translate(10, 5)">
                  <rect x="5" y="8" width="24" height="24" rx="8" fill="#E8F0FE" transform="rotate(-12 17 20)" />
                  <rect x="12" y="12" width="24" height="24" rx="8" fill="#487BE5" transform="rotate(8 24 24)" />
                  <path d="M 38 2 Q 40 8 46 10 Q 40 12 38 18 Q 36 12 30 10 Q 36 8 38 2 Z" fill="#FFC83D" />
                </g>
                <text x="65" y="34" font-family="'Pretendard', -apple-system, sans-serif" font-weight="800" font-size="26" fill="currentColor" letter-spacing="-0.5">Jaba</text>
                <text x="125" y="34" font-family="'Pretendard', -apple-system, sans-serif" font-weight="700" font-size="22" fill="#487BE5" letter-spacing="-0.5">클래스</text>
              </svg>
            </RouterLink>
            <h1 class="text-2xl font-black text-base-content tracking-tight">시작해볼까요? ✨</h1>
            <p class="text-base-content/40 mt-2 font-bold">간편하게 가입하고 클래스를 즐겨보세요</p>
          </div>

          <!-- Alert Messages -->
          <div v-if="error || success" class="space-y-4 mb-6">
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
              <div class="flex flex-col sm:flex-row gap-2">
                <input v-model="email" @input="onEmailInput" type="email" placeholder="email@example.com" :disabled="emailDisabled"
                  class="input bg-base-200 border-none focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-2xl font-bold transition-all h-12 sm:h-14 text-sm sm:text-base w-full disabled:opacity-50" />
                <button @click="checkEmail" :disabled="emailCheckLoading || emailDisabled"
                  class="btn rounded-2xl px-6 h-12 sm:h-14 border-none shadow-sm transition-all active:scale-95 text-sm font-black w-full sm:w-auto shrink-0"
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
                  class="btn btn-primary w-full rounded-2xl font-black shadow-xl shadow-primary/20 h-12 sm:h-14 border-none">
                  {{ sendBtnText }}
                </button>
              </div>
            </transition>

            <!-- 3단계: 인증번호 입력 -->
            <transition name="slide-up">
              <div v-if="showCodeSection" class="form-control">
                <label class="label pt-0"><span class="label-text text-xs font-black text-base-content/40 ml-1">인증번호</span></label>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input v-model="code" type="text" placeholder="6자리 숫자" maxlength="6"
                    class="input bg-base-200 border-none focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-2xl font-black text-center tracking-[0.5em] transition-all h-12 sm:h-14 w-full" />
                  <button @click="verifyCode" class="btn bg-base-content text-base-100 rounded-2xl px-6 h-12 sm:h-14 border-none font-black transition-all active:scale-95 w-full sm:w-auto shrink-0">
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
                    class="input bg-base-200 border-none focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-2xl font-bold transition-all h-12 sm:h-14 text-sm sm:text-base" />
                </div>
                <div class="form-control">
                  <label class="label pt-0"><span class="label-text text-xs font-black text-base-content/40 ml-1">비밀번호</span></label>
                  <input v-model="password" type="password" placeholder="8자 이상 입력" 
                    class="input bg-base-200 border-none focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-2xl font-bold transition-all h-12 sm:h-14 text-sm sm:text-base" />
                </div>
                <div class="form-control">
                  <label class="label pt-0"><span class="label-text text-xs font-black text-base-content/40 ml-1">전화번호</span></label>
                  <input v-model="phone" type="tel" placeholder="01012345678" 
                    class="input bg-base-200 border-none focus:bg-white focus:ring-2 focus:ring-primary/20 rounded-2xl font-bold transition-all h-12 sm:h-14 text-sm sm:text-base" />
                </div>
                <button @click="register" class="btn btn-primary w-full mt-4 rounded-2xl font-black shadow-xl shadow-primary/20 h-12 sm:h-14 border-none">
                  가입 완료하기
                </button>
              </div>
            </transition>
          </div>

          <div class="mt-6 sm:mt-10 pt-6 sm:pt-8 border-t border-base-300/30 text-center">
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
