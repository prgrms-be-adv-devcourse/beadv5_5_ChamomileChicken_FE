<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

const sections = [
  {
    title: '수집하는 개인정보 항목',
    content: '회원가입 시 이름, 이메일, 비밀번호, 전화번호를 수집합니다. 소셜 로그인 시 해당 서비스에서 제공하는 기본 프로필 정보를 수집할 수 있습니다. 서비스 이용 중 결제 정보, 예약 내역, 리뷰 등이 생성됩니다.',
  },
  {
    title: '개인정보 수집 및 이용 목적',
    content: '수집된 개인정보는 회원 관리, 서비스 제공(클래스 예약·결제), 고객 문의 처리, 서비스 개선 및 AI 기반 맞춤 추천에 활용됩니다. 동의 없이 마케팅 목적으로 이용하지 않습니다.',
  },
  {
    title: '개인정보 보유 및 이용 기간',
    content: '개인정보는 회원 탈퇴 시까지 보유합니다. 단, 관계 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다. 결제 기록은 전자상거래법에 따라 5년간 보관됩니다.',
  },
  {
    title: '개인정보의 제3자 제공',
    content: '회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 결제 처리를 위해 토스페이먼츠에 최소한의 정보를 제공하며, 법령에 따른 요청이 있는 경우 예외가 적용될 수 있습니다.',
  },
  {
    title: '개인정보 보호',
    content: '회사는 개인정보 보호를 위해 암호화된 통신(HTTPS)을 사용하며, 비밀번호는 복호화 불가능한 방식으로 저장됩니다. 개인정보에 대한 접근은 최소한의 담당자로 제한됩니다.',
  },
  {
    title: '이용자의 권리',
    content: '이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 권리가 있습니다. 마이페이지 > [내 정보] 탭에서 직접 수정 가능하며, 탈퇴 및 추가 문의는 cc.team.2026@gmail.com으로 연락해주세요.',
  },
  {
    title: '쿠키 및 로컬스토리지',
    content: '서비스는 최근 본 상품, 검색 기록 등 편의 기능을 위해 브라우저 로컬스토리지를 사용합니다. 이 데이터는 서버로 전송되지 않으며, 브라우저 설정에서 삭제 가능합니다.',
  },
]
</script>

<template>
  <div class="bg-base-200 min-h-screen pb-20">
    <div class="navbar bg-base-100/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-10 border-b border-base-300/50">
      <div class="flex-1">
        <RouterLink to="/" class="hover:opacity-80 transition-opacity">
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
      <button @click="router.back()" class="btn btn-ghost btn-sm rounded-full font-bold">뒤로가기</button>
    </div>

    <div class="max-w-3xl mx-auto px-4 py-12">
      <div class="text-center mb-12">
        <h1 class="text-2xl sm:text-4xl font-black tracking-tight text-base-content mb-3">개인정보처리방침</h1>
        <p class="text-base-content/40 text-sm font-bold">최종 수정일: 2026년 1월 1일</p>
      </div>

      <div class="space-y-4">
        <div v-for="section in sections" :key="section.title"
          class="card bg-base-100 rounded-[24px] border border-base-300/20 shadow-sm p-6">
          <h2 class="font-black text-base-content mb-3">{{ section.title }}</h2>
          <p class="text-base-content/60 font-medium text-sm leading-relaxed">{{ section.content }}</p>
        </div>
      </div>

      <div class="mt-10 card bg-primary/5 border border-primary/10 rounded-[24px] p-6 text-center">
        <p class="text-sm font-bold text-base-content/50 mb-2">개인정보 관련 문의는 이메일로 연락주세요.</p>
        <a href="mailto:cc.team.2026@gmail.com" class="text-primary font-black text-sm hover:underline">cc.team.2026@gmail.com</a>
      </div>
    </div>
  </div>
</template>
