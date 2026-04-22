<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const errorCode = route.query.code
const errorMessage = route.query.message
</script>

<template>
  <div class="hero min-h-screen bg-base-200">
    <div class="hero-content w-full max-w-[480px] p-4">
      <div class="card w-full bg-base-100 shadow-sm border border-base-300/30 rounded-[40px] overflow-hidden animate-in fade-in zoom-in duration-500">
        <div class="card-body p-8 lg:p-12 items-center text-center">
          <div class="w-24 h-24 rounded-full bg-error/10 flex items-center justify-center mb-8 animate-shake">
            <svg class="w-12 h-12 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 class="text-3xl font-black text-base-content tracking-tight mb-4">결제에 실패했습니다</h2>
          
          <div v-if="errorCode || errorMessage" class="bg-base-200/50 rounded-2xl p-6 w-full text-left mb-8">
            <p v-if="errorCode" class="text-xs font-black text-base-content/30 mb-1 uppercase">Error Code</p>
            <p v-if="errorCode" class="text-sm font-black mb-4">{{ errorCode }}</p>
            <p class="text-xs font-black text-base-content/30 mb-1 uppercase">Message</p>
            <p class="text-sm font-bold text-base-content/70 leading-relaxed">{{ errorMessage }}</p>
          </div>

          <div class="card-actions w-full">
            <RouterLink to="/products" class="btn btn-primary btn-lg w-full h-16 rounded-2xl font-black shadow-xl shadow-primary/20 border-none">
              다시 시도하기
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
