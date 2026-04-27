<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

const sections = [
  {
    title: '제1조 (목적)',
    content: '이 약관은 잡아클래스(이하 "회사")가 운영하는 클래스 예약 플랫폼(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항 등을 규정함을 목적으로 합니다.',
  },
  {
    title: '제2조 (이용약관의 효력 및 변경)',
    content: '이 약관은 서비스를 이용하고자 하는 모든 이용자에게 적용됩니다. 회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지를 통해 이용자에게 고지합니다.',
  },
  {
    title: '제3조 (서비스의 제공 및 변경)',
    content: '회사는 클래스 탐색, 예약, 결제, AI 맞춤 추천 등의 서비스를 제공합니다. 회사는 운영상 또는 기술상의 이유로 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.',
  },
  {
    title: '제4조 (회원가입 및 관리)',
    content: '이용자는 회사가 정한 양식에 따라 이름, 이메일, 비밀번호, 전화번호를 입력하여 회원가입을 할 수 있습니다. 소셜 로그인(카카오, 구글, 네이버)을 통한 가입도 지원합니다. 이용자는 정확한 정보를 입력해야 하며, 변경 사항 발생 시 즉시 수정해야 합니다.',
  },
  {
    title: '제5조 (서비스 이용)',
    content: '클래스 예약은 예치금 충전 후 이용 가능합니다. 예약 완료 후에는 마이페이지에서 주문 내역을 확인할 수 있습니다. 클래스 환불은 수업 시작일까지 남은 기간에 따라 환불 정책이 적용됩니다.',
  },
  {
    title: '제6조 (이용자의 의무)',
    content: '이용자는 서비스를 이용함에 있어 타인의 권리를 침해하거나 법령에 위반되는 행위를 해서는 안 됩니다. 계정 정보의 관리 책임은 이용자에게 있으며, 타인에게 양도하거나 대여할 수 없습니다.',
  },
  {
    title: '제7조 (분쟁 해결)',
    content: '서비스 이용과 관련하여 발생한 분쟁은 회사와 이용자가 협의하여 해결합니다. 협의가 이루어지지 않을 경우 관련 법령에 따라 처리합니다. 문의: cc.team.2026@gmail.com',
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
        <h1 class="text-2xl sm:text-4xl font-black tracking-tight text-base-content mb-3">이용약관</h1>
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
        <p class="text-sm font-bold text-base-content/50 mb-2">약관에 대한 문의는 이메일로 연락주세요.</p>
        <a href="mailto:cc.team.2026@gmail.com" class="text-primary font-black text-sm hover:underline">cc.team.2026@gmail.com</a>
      </div>
    </div>
  </div>
</template>
