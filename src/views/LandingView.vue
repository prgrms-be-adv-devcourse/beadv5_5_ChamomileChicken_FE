<script setup>
import { useAuthStore } from '@/stores/auth'
import ThemeToggle from '@/components/ThemeToggle.vue'

const auth = useAuthStore()
</script>

<template>
  <div class="bg-base-100 min-h-screen">
    <!-- Navbar -->
    <div class="navbar sticky top-0 z-30 border-b border-base-300/40 bg-base-100/80 backdrop-blur-md px-4 lg:px-10">
      <div class="flex-1">
        <RouterLink to="/products">
          <svg width="220" height="50" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg" class="h-8 sm:h-12 w-auto">
            <g transform="translate(10, 5)">
              <rect x="5" y="8" width="24" height="24" rx="8" fill="#E8F0FE" transform="rotate(-12 17 20)" />
              <rect x="12" y="12" width="24" height="24" rx="8" fill="#487BE5" transform="rotate(8 24 24)" />
              <path d="M 38 2 Q 40 8 46 10 Q 40 12 38 18 Q 36 12 30 10 Q 36 8 38 2 Z" fill="#FFC83D" />
            </g>
            <text x="65" y="34" font-family="'Pretendard', -apple-system, sans-serif" font-weight="800" font-size="26" fill="currentColor" letter-spacing="-0.5">Jaba</text>
            <text x="125" y="34" font-family="'Pretendard', -apple-system, sans-serif" font-weight="700" font-size="22" fill="#487BE5" letter-spacing="-0.5">클래스</text>
          </svg>
        </RouterLink>
      </div>
      <div class="flex-none flex items-center gap-3">
        <ThemeToggle />
        <RouterLink to="/faq" class="btn btn-ghost btn-sm rounded-full font-bold hidden sm:flex">자주 묻는 질문</RouterLink>
        <template v-if="auth.isLoggedIn">
          <RouterLink to="/products" class="btn btn-primary btn-sm rounded-full px-6">클래스 보기</RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/login" class="btn btn-ghost btn-sm rounded-full font-bold">로그인</RouterLink>
          <RouterLink to="/signup" class="btn btn-primary btn-sm rounded-full px-6">무료 가입</RouterLink>
        </template>
      </div>
    </div>

    <!-- Hero -->
    <section class="max-w-5xl mx-auto px-4 pt-20 pb-24 text-center">
      <div class="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-black px-4 py-2 rounded-full mb-6 border border-primary/20">
        <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
        새로운 취미 클래스가 매일 업데이트돼요
      </div>
      <h1 class="text-4xl sm:text-5xl lg:text-7xl font-black text-base-content leading-tight tracking-tighter mb-6 float-anim">
        배움의 즐거움을<br />
        <span style="background: linear-gradient(135deg, #3182f6, #7c4dff); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">지금 시작해요</span>
      </h1>
      <p class="text-base-content/50 text-lg sm:text-xl font-medium mb-10 max-w-xl mx-auto leading-relaxed">
        요가, 베이킹, 드로잉까지. 원하는 클래스를 찾고 예약하세요.<br class="hidden sm:block" />
        전문 강사진이 당신의 새로운 취미를 함께합니다.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <RouterLink to="/products" class="btn btn-primary btn-lg rounded-2xl px-10 font-black shadow-xl shadow-primary/25 text-base float-anim" style="animation-delay: 0.5s">
          클래스 둘러보기
        </RouterLink>
        <RouterLink to="/signup" class="btn bg-base-200 hover:bg-base-300 btn-lg rounded-2xl px-10 font-black text-base border-none float-anim" style="animation-delay: 1s">
          무료로 시작하기
        </RouterLink>
      </div>
    </section>

    <!-- Stats -->
    <section class="bg-base-200/50 py-12 border-y border-base-300/30">
      <div class="max-w-4xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
        <div>
          <p class="text-3xl sm:text-4xl font-black text-primary mb-1">100+</p>
          <p class="text-xs font-black text-base-content/40 uppercase tracking-widest">클래스</p>
        </div>
        <div>
          <p class="text-3xl sm:text-4xl font-black text-primary mb-1">50+</p>
          <p class="text-xs font-black text-base-content/40 uppercase tracking-widest">강사진</p>
        </div>
        <div>
          <p class="text-3xl sm:text-4xl font-black text-primary mb-1">1,000+</p>
          <p class="text-xs font-black text-base-content/40 uppercase tracking-widest">수강생</p>
        </div>
        <div>
          <p class="text-3xl sm:text-4xl font-black text-primary mb-1">4.9★</p>
          <p class="text-xs font-black text-base-content/40 uppercase tracking-widest">평균 평점</p>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="max-w-5xl mx-auto px-4 py-20">
      <h2 class="text-2xl sm:text-3xl font-black text-center mb-12 tracking-tight">왜 잡아클래스인가요?</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div class="card bg-base-100 border border-base-300/30 rounded-[32px] p-8 shadow-sm hover:shadow-md transition-all">
          <div class="text-4xl mb-4">🎯</div>
          <h3 class="text-lg font-black mb-2">검증된 강사</h3>
          <p class="text-base-content/50 font-medium text-sm leading-relaxed">사업자 등록 강사만 입점 가능해요. <br />믿을 수 있는 전문가에게 배우세요.</p>
        </div>
        <div class="card bg-base-100 border border-base-300/30 rounded-[32px] p-8 shadow-sm hover:shadow-md transition-all">
          <div class="text-4xl mb-4">💳</div>
          <h3 class="text-lg font-black mb-2">간편한 예치금 결제</h3>
          <p class="text-base-content/50 font-medium text-sm leading-relaxed">미리 충전해두고 클릭 한 번으로 예약하세요. <br />예치금 충전으로 보너스를 받아보세요.</p>
        </div>
        <div class="card bg-base-100 border border-base-300/30 rounded-[32px] p-8 shadow-sm hover:shadow-md transition-all">
          <div class="text-4xl mb-4">✨</div>
          <h3 class="text-lg font-black mb-2">AI 맞춤 추천</h3>
          <p class="text-base-content/50 font-medium text-sm leading-relaxed">AI 기반으로 내 취향과 활동을 분석해 딱 맞는 클래스를 추천해드려요.</p>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="bg-base-200/50 border-y border-base-300/30 py-20">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-2xl sm:text-3xl font-black text-center mb-12 tracking-tight">이렇게 시작해요</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary font-black text-xl flex items-center justify-center mx-auto mb-4">1</div>
            <h3 class="font-black mb-2">클래스 탐색</h3>
            <p class="text-sm text-base-content/50 font-medium">누구나 쉽게 시작할 수 있어요. <br />먼저 원하는 클래스 일정을 확인하세요.</p>
          </div>
          <div class="text-center">
            <div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary font-black text-xl flex items-center justify-center mx-auto mb-4">2</div>
            <h3 class="font-black mb-2">결제 및 예치금</h3>
            <p class="text-sm text-base-content/50 font-medium">원하는 클래스를 결제하고 예약하세요. <br /> 예치금 사용도 가능해요!</p>
          </div>
          <div class="text-center">
            <div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary font-black text-xl flex items-center justify-center mx-auto mb-4">3</div>
            <h3 class="font-black mb-2">클래스 수강</h3>
            <p class="text-sm text-base-content/50 font-medium">야호 끝났어요! <br />예약한 일정에 참여하고 새로운 취미를 즐기세요.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="max-w-3xl mx-auto px-4 py-24 text-center">
      <h2 class="text-3xl sm:text-4xl font-black mb-4 tracking-tight">지금 바로 시작해볼까요?</h2>
      <p class="text-base-content/40 font-medium mb-8">가입은 무료, 클래스는 다양하게.</p>
      <RouterLink to="/signup" class="btn btn-primary btn-lg rounded-2xl px-14 font-black shadow-xl shadow-primary/25 float-anim">
        무료로 시작하기
      </RouterLink>
    </section>

    <!-- Footer -->
    <footer class="border-t border-base-300/50 bg-base-200/50 py-10">
      <div class="max-w-5xl mx-auto px-4 text-center">
        <div class="mb-4">
          <img src="/logo.svg" alt="잡아클래스" class="h-8 mx-auto opacity-40 grayscale" />
        </div>
        <div class="flex flex-wrap justify-center gap-4 text-xs font-bold text-base-content/30 mb-4">
          <RouterLink to="/terms" class="hover:text-base-content/60 transition-colors">이용약관</RouterLink>
          <RouterLink to="/privacy" class="hover:text-base-content/60 transition-colors">개인정보처리방침</RouterLink>
          <RouterLink to="/refund-policy" class="hover:text-base-content/60 transition-colors">환불 정책</RouterLink>
          <RouterLink to="/faq" class="hover:text-base-content/60 transition-colors">자주 묻는 질문</RouterLink>
        </div>
        <p class="text-base-content/30 text-xs">© 2026 잡아클래스. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.float-anim {
  animation: floating 4s ease-in-out infinite;
}

@keyframes floating {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-14px); }
  100% { transform: translateY(0px); }
}
</style>
