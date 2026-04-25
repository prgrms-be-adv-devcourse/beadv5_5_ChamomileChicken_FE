<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const errorMessage = route.query.message || '예치금 충전에 실패했습니다.'
</script>

<template>
  <div class="min-h-screen bg-base-200 flex items-center justify-center overflow-y-auto py-8">
    <div class="w-full max-w-md px-4">
      <div class="card w-full shadow-2xl bg-base-100 text-center">
        <div class="card-body items-center">
          <div class="w-20 h-20 rounded-full bg-error/10 flex items-center justify-center mb-2">
            <svg class="w-10 h-10 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 class="card-title text-2xl text-error">충전 실패</h2>
          <p class="text-base-content/60 mt-2">{{ errorMessage }}</p>
          <div class="card-actions w-full mt-4">
            <RouterLink to="/deposit/charge" class="btn btn-outline w-full">다시 시도</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
