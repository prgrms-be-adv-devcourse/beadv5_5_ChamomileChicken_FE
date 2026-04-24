<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()

const faqs = [
  {
    category: '판매자',
    items: [
      {
        q: '판매자(강사)로 등록하려면 어떻게 해야 하나요?',
        a: '판매자 등록을 원하시면 사업자 등록증을 첨부하여 <strong>cc.team.2026@gmail.com</strong> 으로 메일을 보내주세요.<br/>검토 후 판매자 권한을 부여해드립니다. 일반적으로 영업일 기준 1~3일 내에 처리됩니다.',
      },
      {
        q: '사업자 등록증이 없어도 판매자 등록이 가능한가요?',
        a: '현재는 사업자 등록증 보유자에 한해 판매자 등록이 가능합니다. 개인 과외나 비공식 수업은 지원하지 않습니다.',
      },
      {
        q: '판매자로 등록하면 어떤 기능을 사용할 수 있나요?',
        a: '판매자로 등록되면 클래스를 직접 등록·수정·삭제할 수 있으며, 일정 관리와 정산 내역 확인이 가능합니다. 마이페이지에서 상품 관리와 정산 메뉴가 활성화됩니다.',
      },
      {
        q: '정산은 언제, 어떻게 받을 수 있나요?',
        a: '마이페이지 > [정산] 메뉴에서 정산 내역을 확인할 수 있습니다. 정산은 수업 완료 후 처리되며, 구체적인 정산 일정은 판매자 등록 승인 시 안내드립니다.',
      },
      {
        q: '클래스 가격은 직접 설정할 수 있나요?',
        a: '네, 클래스 등록 시 1인 기준 가격을 자유롭게 설정할 수 있습니다. 최대 수강 인원, 일정, 장소 등도 함께 입력하게 됩니다.',
      },
    ],
  },
  {
    category: '예치금',
    items: [
      {
        q: '예치금이란 무엇인가요?',
        a: '예치금은 클래스 결제 시 사용하는 선충전 포인트입니다. 마이페이지에서 카드로 충전한 뒤 클래스 예약에 사용할 수 있습니다.',
      },
      {
        q: '예치금 충전 최소 금액이 있나요?',
        a: '최소 충전 금액은 1,000원입니다. 1만원·5만원·10만원·50만원·100만원·300만원 단위 버튼으로 빠르게 충전하거나 금액을 직접 입력할 수도 있습니다.',
      },
      {
        q: '충전한 예치금의 유효기간이 있나요?',
        a: '현재 예치금의 별도 유효기간은 없습니다. 단, 서비스 정책 변경 시 사전 공지 후 적용됩니다.',
      },
      {
        q: '충전한 예치금은 환불이 되나요?',
        a: '미사용 예치금은 cc.team.2026@gmail.com 으로 문의하시면 환불 처리해드립니다. 이미 클래스 결제에 사용된 예치금은 환불되지 않습니다.',
      },
      {
        q: '예치금 결제 내역은 어디서 확인하나요?',
        a: '마이페이지 > [예치금 내역] 탭에서 충전·사용·환불 이력을 날짜와 금액 별로 확인할 수 있습니다.',
      },
    ],
  },
  {
    category: '예약 및 결제',
    items: [
      {
        q: '클래스 예약은 어떻게 하나요?',
        a: '원하는 클래스 상세 페이지에서 일정을 선택하고 인원 수를 입력한 뒤, 예치금으로 결제하면 예약이 완료됩니다.',
      },
      {
        q: '결제 수단은 무엇이 있나요?',
        a: '현재는 예치금 결제만 지원합니다. 예치금은 토스페이먼츠를 통해 카드로 충전할 수 있으며, 안전하게 처리됩니다.',
      },
      {
        q: '예약 취소 및 환불은 어떻게 하나요?',
        a: '마이페이지 > [주문 내역] 탭에서 해당 주문의 [환불신청] 버튼을 누르면 됩니다. 환불 금액은 수업 시작일까지 남은 기간에 따라 달라질 수 있습니다.',
      },
      {
        q: '이미 결제한 클래스 일정을 변경할 수 있나요?',
        a: '현재 일정 변경 기능은 지원되지 않습니다. 일정 변경이 필요하다면 기존 예약을 환불 후 원하는 일정으로 재예약해주세요.',
      },
      {
        q: '같은 클래스를 여러 명이 함께 예약할 수 있나요?',
        a: '네, 예약 시 인원 수를 선택할 수 있습니다. 단, 클래스별 최대 수강 인원 제한이 있으므로 잔여 자리를 확인해주세요.',
      },
    ],
  },
  {
    category: '회원',
    items: [
      {
        q: '소셜 로그인(카카오, 구글, 네이버)을 사용할 수 있나요?',
        a: '네, 카카오·구글·네이버 소셜 로그인을 지원합니다. 로그인 페이지에서 원하는 소셜 계정으로 간편하게 가입 및 로그인하실 수 있습니다.',
      },
      {
        q: '이름이나 전화번호를 수정하고 싶어요.',
        a: '마이페이지 > [내 정보] 탭에서 [수정] 버튼을 눌러 이름과 전화번호를 변경할 수 있습니다.',
      },
      {
        q: '비밀번호를 잊어버렸어요.',
        a: '현재 비밀번호 찾기 기능은 준비 중입니다. cc.team.2026@gmail.com 으로 문의해주시면 도움드리겠습니다.',
      },
      {
        q: '회원 탈퇴는 어떻게 하나요?',
        a: '현재 앱 내 직접 탈퇴 기능은 준비 중입니다. 탈퇴를 원하시면 cc.team.2026@gmail.com 으로 문의해주세요.',
      },
    ],
  },
]

const openKey = ref(null)

function toggle(key) {
  openKey.value = openKey.value === key ? null : key
}
</script>

<template>
  <div class="bg-base-200 min-h-screen pb-20">
    <!-- Navbar -->
    <div class="navbar bg-base-100/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-10 border-b border-base-300/50">
      <div class="flex-1">
        <RouterLink to="/products" class="hover:opacity-80 transition-opacity">
          <svg width="220" height="50" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg" class="h-12 lg:h-14 w-auto">
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
        <button @click="router.back()" class="btn btn-ghost btn-sm rounded-full font-bold">뒤로가기</button>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 py-12">
      <!-- Header -->
      <div class="text-center mb-12">
        <h1 class="text-4xl font-black tracking-tight text-base-content mb-3">자주 묻는 질문</h1>
        <p class="text-base-content/50 text-lg">궁금한 점이 있으시면 아래 내용을 확인해보세요.</p>
      </div>

      <!-- FAQ Categories -->
      <div class="space-y-10">
        <div v-for="section in faqs" :key="section.category">
          <h2 class="text-xs font-black text-primary uppercase tracking-widest mb-4 ml-1">{{ section.category }}</h2>
          <div class="space-y-3">
            <div
              v-for="item in section.items"
              :key="item.q"
              class="card bg-base-100 rounded-[24px] border border-base-300/20 overflow-hidden shadow-sm transition-all"
              :class="{ 'shadow-md border-primary/20': openKey === item.q }"
            >
              <button
                @click="toggle(item.q)"
                class="w-full flex items-center justify-between p-6 text-left gap-4"
              >
                <span class="font-black text-base text-base-content">{{ item.q }}</span>
                <svg
                  class="w-5 h-5 shrink-0 text-base-content/30 transition-transform duration-300"
                  :class="{ 'rotate-180 text-primary': openKey === item.q }"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div v-if="openKey === item.q" class="px-6 pb-6">
                <div class="h-px bg-base-300/30 mb-5"></div>
                <p class="text-base-content/70 font-medium leading-relaxed" v-html="item.a"></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact -->
      <div class="mt-14 card bg-primary/5 border border-primary/10 rounded-[32px] p-10 text-center">
        <p class="text-2xl mb-2">💬</p>
        <h3 class="text-lg font-black mb-2">해결이 안 되셨나요?</h3>
        <p class="text-base-content/50 font-medium mb-4">추가 문의는 이메일로 연락주세요.</p>
        <a href="mailto:cc.team.2026@gmail.com" class="btn btn-primary rounded-2xl px-8 font-black shadow-lg shadow-primary/20">
          cc.team.2026@gmail.com
        </a>
      </div>
    </div>
  </div>
</template>