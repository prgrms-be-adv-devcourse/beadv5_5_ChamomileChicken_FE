<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

const policies = [
  { days: '7일 이상', rate: '100%', color: 'text-success', bg: 'bg-success/10 border-success/20' },
  { days: '5~6일', rate: '80%', color: 'text-info', bg: 'bg-info/10 border-info/20' },
  { days: '3~4일', rate: '60%', color: 'text-warning', bg: 'bg-warning/10 border-warning/20' },
  { days: '1~2일', rate: '40%', color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800/30' },
  { days: '당일', rate: '0%', color: 'text-error', bg: 'bg-error/10 border-error/20' },
]

const faqs = [
  {
    q: '환불 신청은 어디서 하나요?',
    a: '마이페이지 > [주문 내역] 탭에서 해당 주문의 [환불신청] 버튼을 클릭하시면 됩니다.',
  },
  {
    q: '환불된 금액은 어디로 돌아오나요?',
    a: '환불 금액은 결제 시 사용한 예치금으로 반환됩니다.',
  },
  {
    q: '수업이 취소된 경우 환불은 어떻게 되나요?',
    a: '강사 또는 운영 측의 사정으로 수업이 취소된 경우 100% 환불 처리됩니다.',
  },
  {
    q: '환불 처리 기간은 얼마나 걸리나요?',
    a: '환불 신청 후 영업일 기준 1~3일 이내에 예치금으로 반환됩니다.',
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
        <h1 class="text-2xl sm:text-4xl font-black tracking-tight text-base-content mb-3">환불 정책</h1>
        <p class="text-base-content/40 text-sm font-bold">최종 수정일: 2026년 1월 1일</p>
      </div>

      <!-- 환불율 테이블 -->
      <div class="card bg-base-100 rounded-[28px] border border-base-300/20 shadow-sm overflow-hidden mb-8">
        <div class="p-6 border-b border-base-300/20">
          <h2 class="font-black text-lg">수업 시작일 기준 환불 비율</h2>
          <p class="text-sm text-base-content/40 font-medium mt-1">환불 신청일 기준으로 수업 시작일까지 남은 기간에 따라 환불 비율이 달라집니다.</p>
        </div>
        <div class="divide-y divide-base-300/20">
          <div v-for="policy in policies" :key="policy.days"
            class="flex items-center justify-between px-6 py-4">
            <div class="flex items-center gap-3">
              <div class="w-2 h-2 rounded-full" :class="policy.color.replace('text-', 'bg-')"></div>
              <span class="font-bold text-sm text-base-content">수업 시작 <strong>{{ policy.days }}</strong> 전 취소</span>
            </div>
            <span class="font-black text-lg" :class="policy.color">{{ policy.rate }}</span>
          </div>
        </div>
      </div>

      <!-- 안내 -->
      <div class="card bg-warning/5 border border-warning/20 rounded-[24px] p-6 mb-8">
        <div class="flex gap-3">
          <span class="text-xl shrink-0">⚠️</span>
          <div>
            <p class="font-black text-sm mb-1">유의사항</p>
            <ul class="text-sm text-base-content/60 font-medium space-y-1 list-disc list-inside">
              <li>환불 금액은 예치금으로 반환됩니다.</li>
              <li>예치금 자체의 현금 환불은 별도 문의가 필요합니다.</li>
              <li>수업 당일 취소 및 노쇼(No-show)는 환불되지 않습니다.</li>
              <li>강사 측 사유로 인한 취소는 100% 환불됩니다.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- FAQ -->
      <h2 class="font-black text-lg mb-4">자주 묻는 환불 질문</h2>
      <div class="space-y-3 mb-10">
        <div v-for="item in faqs" :key="item.q"
          class="card bg-base-100 rounded-[20px] border border-base-300/20 p-5 shadow-sm">
          <p class="font-black text-sm mb-2">Q. {{ item.q }}</p>
          <p class="text-sm text-base-content/60 font-medium">{{ item.a }}</p>
        </div>
      </div>

      <div class="card bg-primary/5 border border-primary/10 rounded-[24px] p-6 text-center">
        <p class="text-sm font-bold text-base-content/50 mb-2">추가 문의는 이메일로 연락주세요.</p>
        <a href="mailto:cc.team.2026@gmail.com" class="text-primary font-black text-sm hover:underline">cc.team.2026@gmail.com</a>
      </div>
    </div>
  </div>
</template>
