<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'

const router = useRouter()

const faqs = [
  {
    category: '판매자',
    icon: '🎯',
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
    icon: '💳',
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
    icon: '📅',
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
    icon: '👤',
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

const activeCategory = ref('전체')
const openKey = ref(null)

const categories = computed(() => ['전체', ...faqs.map((f) => f.category)])

const filteredFaqs = computed(() =>
  activeCategory.value === '전체' ? faqs : faqs.filter((f) => f.category === activeCategory.value),
)

function selectCategory(cat) {
  activeCategory.value = cat
  openKey.value = null
}

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

    <!-- Hero -->
    <div class="relative overflow-hidden bg-base-100 border-b border-base-300/30">
      <div class="absolute inset-0 opacity-[0.03]" style="background: radial-gradient(ellipse at 70% 50%, #487BE5 0%, transparent 70%)"></div>
      <div class="max-w-3xl mx-auto px-4 py-14 sm:py-20 text-center relative">
        <div class="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-black px-4 py-2 rounded-full mb-5 border border-primary/20">
          <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>
          궁금한 점을 빠르게 해결해드려요
        </div>
        <h1 class="text-3xl sm:text-5xl font-black tracking-tight text-base-content mb-4 leading-tight">
          자주 묻는 질문
        </h1>
        <p class="text-base-content/50 font-medium text-sm sm:text-base max-w-md mx-auto leading-relaxed">
          아래에서 원하는 주제를 선택하거나 전체 질문을 확인해보세요.
        </p>

<!--        &lt;!&ndash; Stats row &ndash;&gt;-->
<!--        <div class="flex items-center justify-center gap-6 mt-8">-->
<!--          <div v-for="section in faqs" :key="section.category" class="text-center">-->
<!--            <p class="text-lg font-black text-primary">{{ section.items.length }}</p>-->
<!--            <p class="text-xs font-bold text-base-content/40">{{ section.category }}</p>-->
<!--          </div>-->
<!--        </div>-->
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 py-10">
      <!-- Category Filter Pills -->
      <div class="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
        <button
          v-for="cat in categories"
          :key="cat"
          @click="selectCategory(cat)"
          class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-black transition-all"
          :class="activeCategory === cat
            ? 'bg-primary text-primary-content shadow-lg shadow-primary/25'
            : 'bg-base-100 text-base-content/60 border border-base-300/40 hover:border-primary/30 hover:text-primary'"
        >
          {{ cat }}
        </button>
      </div>

      <!-- FAQ Sections -->
      <div class="space-y-8">
        <div v-for="section in filteredFaqs" :key="section.category">
          <!-- Section Header -->
          <div class="flex items-center gap-3 mb-4">
            <div class="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
              {{ section.icon }}
            </div>
            <div>
              <h2 class="font-black text-base-content text-base leading-none">{{ section.category }}</h2>
              <p class="text-xs text-base-content/40 font-bold mt-0.5">{{ section.items.length }}개의 질문</p>
            </div>
          </div>

          <!-- Items -->
          <div class="space-y-2">
            <div
              v-for="item in section.items"
              :key="item.q"
              class="bg-base-100 rounded-[20px] border overflow-hidden transition-all duration-200"
              :class="openKey === item.q
                ? 'border-primary/25 shadow-md shadow-primary/5'
                : 'border-base-300/20 shadow-sm hover:border-base-300/50'"
            >
              <button
                @click="toggle(item.q)"
                class="w-full flex items-center justify-between px-5 py-4 text-left gap-4 group"
              >
                <div class="flex items-start gap-3 min-w-0">
                  <span
                    class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black mt-0.5 transition-colors"
                    :class="openKey === item.q ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content/40'"
                  >Q</span>
                  <span class="font-bold text-sm sm:text-base text-base-content leading-snug">{{ item.q }}</span>
                </div>
                <svg
                  class="w-4 h-4 shrink-0 transition-transform duration-300 text-base-content/30"
                  :class="{ 'rotate-180 !text-primary': openKey === item.q }"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div
                class="overflow-hidden transition-all duration-300"
                :class="openKey === item.q ? 'max-h-96' : 'max-h-0'"
              >
                <div class="px-5 pb-5">
                  <div class="flex gap-3">
                    <span class="flex-shrink-0 w-5 h-5 rounded-full bg-base-200 flex items-center justify-center text-xs font-black text-base-content/40 mt-0.5">A</span>
                    <p class="text-base-content/70 font-medium leading-relaxed text-sm sm:text-base" v-html="item.a"></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact -->
      <div class="mt-14 relative overflow-hidden rounded-[32px] p-8 sm:p-12 text-center" style="background: linear-gradient(135deg, #3182f6 0%, #7c4dff 100%)">
        <div class="absolute inset-0 opacity-10" style="background: radial-gradient(circle at 80% 20%, white 0%, transparent 50%)"></div>
        <div class="relative">
          <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl mx-auto mb-4">💬</div>
          <h3 class="text-xl font-black text-white mb-2">해결이 안 되셨나요?</h3>
          <p class="text-white/70 font-medium mb-6 text-sm">직접 문의하시면 빠르게 도와드리겠습니다.</p>
          <a
            href="mailto:cc.team.2026@gmail.com"
            class="inline-flex items-center gap-2 bg-white text-primary font-black rounded-2xl px-6 py-3 text-sm shadow-xl hover:shadow-2xl transition-shadow"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            cc.team.2026@gmail.com
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
