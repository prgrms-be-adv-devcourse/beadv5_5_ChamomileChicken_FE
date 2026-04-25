<script setup>
import { useRouter } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
const router = useRouter()

const values = [
  {
    icon: '🎯',
    title: '검증된 전문가',
    desc: '사업자 등록 강사만 입점 가능합니다.\n자격을 갖춘 전문가에게 제대로 배우세요.',
  },
  {
    icon: '💡',
    title: '다양한 분야',
    desc: '요가, 베이킹, 드로잉, 음악까지. 당신의 새로운 취미를 찾아드립니다.',
  },
  {
    icon: '🤝',
    title: '투명한 거래',
    desc: '예치금 시스템과 명확한 환불 정책으로 믿고 결제할 수 있습니다.',
  },
  {
    icon: '✨',
    title: 'AI 맞춤 추천',
    desc: '활동 패턴을 분석해 나에게 딱 맞는 클래스를 추천해드립니다.',
  },
]

const team = [
  { name: 'ChamomileChicken', role: 'Team Lead & Backend', emoji: '🐔' },
  { name: 'Dev Member 2', role: 'Backend', emoji: '⚙️' },
  { name: 'Dev Member 3', role: 'Backend', emoji: '🛠️' },
  { name: 'Dev Member 4', role: 'Frontend', emoji: '🎨' },
]
</script>

<template>
  <div class="bg-base-200 min-h-screen pb-20">
    <!-- Navbar -->
    <div class="navbar bg-base-100/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-10 border-b border-base-300/50">
      <div class="flex-1">
        <RouterLink to="/products" class="hover:opacity-80 transition-opacity">
          <svg width="220" height="50" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg" class="h-12 w-auto">
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
      <div class="flex items-center gap-3">
        <ThemeToggle />
        <button @click="router.back()" class="btn btn-ghost btn-sm rounded-full font-bold">뒤로가기</button>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 py-12">

      <!-- Hero -->
      <div class="text-center mb-16">
        <p class="text-xs font-black text-primary uppercase tracking-[0.3em] mb-4">About Us</p>
        <h1 class="text-3xl sm:text-5xl font-black tracking-tight text-base-content mb-4 leading-tight">
          배움을 더 쉽고<br />즐겁게 만듭니다
        </h1>
        <p class="text-base-content/50 font-medium text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
          우리는 배우고 싶은 사람과 가르치고 싶은 전문가를 연결합니다
        </p>
      </div>

      <!-- 미션 카드 -->
      <div class="card bg-base-100 border border-base-300/20 rounded-[32px] p-8 sm:p-12 mb-10 shadow-sm relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 -translate-y-1/2 translate-x-1/2" style="background: linear-gradient(135deg, #3182f6, #7c4dff)"></div>
        <p class="text-xs font-black text-primary uppercase tracking-widest mb-4">Our Mission</p>
        <p class="text-xl sm:text-2xl font-black text-base-content leading-snug">
          "누구나 원하는 것을 배울 수 있는 세상을 만든다"<br class="hidden sm:block" />

        </p>
        <p class="text-base-content/40 font-medium mt-4 text-sm sm:text-base">
          취미는 사치가 아닙니다. 잡아클래스는 양질의 클래스를 더 많은 사람에게 닿게 합니다.
        </p>
      </div>

      <!-- 핵심 가치 -->
      <h2 class="text-lg font-black text-base-content mb-4">핵심 가치</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <div v-for="v in values" :key="v.title"
          class="card bg-base-100 border border-base-300/20 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-all">
          <div class="text-3xl mb-3">{{ v.icon }}</div>
          <h3 class="font-black mb-1">{{ v.title }}</h3>
          <p class="text-sm text-base-content/50 font-medium leading-relaxed">{{ v.desc }}</p>
        </div>
      </div>

<!--      &lt;!&ndash; 팀 &ndash;&gt;-->
<!--      <h2 class="text-lg font-black text-base-content mb-4">팀 소개</h2>-->
<!--      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">-->
<!--        <div v-for="member in team" :key="member.name"-->
<!--          class="card bg-base-100 border border-base-300/20 rounded-[24px] p-6 shadow-sm text-center hover:shadow-md transition-all">-->
<!--          <div class="text-4xl mb-3">{{ member.emoji }}</div>-->
<!--          <p class="font-black text-sm mb-1">{{ member.name }}</p>-->
<!--          <p class="text-xs text-base-content/40 font-bold">{{ member.role }}</p>-->
<!--        </div>-->
<!--      </div>-->

      <!-- Stats -->
      <div class="card bg-primary/5 border border-primary/10 rounded-[32px] p-8 mb-10">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div>
            <p class="text-3xl font-black text-primary mb-1">100+</p>
            <p class="text-xs font-black text-base-content/40 uppercase tracking-widest">클래스</p>
          </div>
          <div>
            <p class="text-3xl font-black text-primary mb-1">50+</p>
            <p class="text-xs font-black text-base-content/40 uppercase tracking-widest">강사진</p>
          </div>
          <div>
            <p class="text-3xl font-black text-primary mb-1">1,000+</p>
            <p class="text-xs font-black text-base-content/40 uppercase tracking-widest">수강생</p>
          </div>
          <div>
            <p class="text-3xl font-black text-primary mb-1">4.9★</p>
            <p class="text-xs font-black text-base-content/40 uppercase tracking-widest">평균 평점</p>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="text-center">
        <p class="text-base-content/40 font-medium mb-4 text-sm">문의 사항이 있으시면 언제든지 연락주세요.</p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <RouterLink to="/products" class="btn btn-primary rounded-2xl px-10 font-black shadow-lg shadow-primary/20">
            클래스 둘러보기
          </RouterLink>
          <a href="mailto:cc.team.2026@gmail.com" class="btn bg-base-100 border border-base-300/50 rounded-2xl px-10 font-black hover:bg-base-200">
            이메일 문의
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
