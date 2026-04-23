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
  <article
    class="group overflow-hidden rounded-[12px] border border-base-300/40 bg-base-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
  >
    <figure class="relative overflow-hidden rounded-[12px] bg-base-100">
      <img
        v-if="product.thumbnailPath"
        :src="resolveImageUrl(product.thumbnailPath)"
        :alt="product.title"
        class="block h-auto w-full transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div v-else class="flex aspect-square w-full items-center justify-center bg-base-100">
        <span class="text-5xl opacity-20">🎨</span>
      </div>
      <div class="absolute left-3 top-3">
        <span class="badge rounded-lg border-none bg-white/90 px-3 py-2 font-black text-primary backdrop-blur">OPEN</span>
      </div>
    </figure>

    <div class="p-4">
      <div class="mb-2 flex items-center gap-2">
        <div class="flex h-6 w-6 items-center justify-center rounded-full bg-base-100 ring-1 ring-base-300/40 text-[10px]">🏢</div>
        <p class="truncate text-xs font-bold uppercase tracking-wider text-base-content/50">{{ product.sellerName }}</p>
      </div>
      <h2 class="mb-2 line-clamp-2 text-base font-extrabold leading-tight transition-colors group-hover:text-primary">
        {{ product.title }}
      </h2>
      <div class="mt-auto flex items-end justify-between">
        <p class="text-xl font-black tracking-tight text-base-content">
          <span class="mr-0.5 text-sm font-bold">₩</span>{{ formatPrice(product.price) }}
        </p>
        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-base-100 ring-1 ring-base-300/50 transition-all group-hover:bg-primary group-hover:text-white group-hover:ring-primary">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </div>
    </div>
  </article>
</template>
