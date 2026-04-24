<script setup>
import { resolveImageUrl } from '@/utils/imageUrl'

const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
})

function formatPrice(price) {
  return Number(price ?? 0).toLocaleString('ko-KR')
}
</script>

<template>
  <article class="group overflow-hidden rounded-2xl bg-base-100 transition-shadow duration-300 hover:shadow-md">
    <!-- 이미지만 확대 (카드 전체는 고정) -->
    <figure class="relative overflow-hidden rounded-2xl bg-base-200 aspect-[4/3]">
      <img
        v-if="product.thumbnailPath"
        :src="resolveImageUrl(product.thumbnailPath)"
        :alt="product.title"
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
      />
      <div v-else class="flex h-full w-full items-center justify-center">
        <span class="text-5xl opacity-20">🎨</span>
      </div>
    </figure>

    <div class="px-0.5 pt-3 pb-2">
      <p class="mb-1 truncate text-xs font-semibold text-base-content/60">{{ product.sellerName }}</p>

      <h2 class="mb-3 line-clamp-2 text-base-content font-extrabold leading-snug text-base-content transition-colors group-hover:text-primary">
        {{ product.title }}
      </h2>

      <div class="mb-3 flex items-center gap-3 text-xs font-semibold text-base-content/60">
        <span v-if="product.maxCapacity" class="flex items-center gap-1">
          <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>~{{ product.maxCapacity }}명</span>
        </span>
        <span v-if="product.duration" class="flex items-center gap-1">
          <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{{ product.duration }}분</span>
        </span>
      </div>

      <div class="flex items-center justify-between border-t border-base-300/50 pt-2.5">
        <span class="text-xs font-semibold text-base-content/60">인당</span>
        <span class="text-[15px] font-black text-base-content">
          {{ formatPrice(product.price) }}<span class="ml-0.5 text-xs font-bold">원~</span>
        </span>
      </div>
    </div>
  </article>
</template>
