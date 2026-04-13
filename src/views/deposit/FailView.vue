<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const errorMessage = route.query.message || '예치금 충전에 실패했습니다.'
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
      <h2 class="text-xl font-bold text-red-600 dark:text-red-400 mb-2">충전 실패</h2>
      <p class="text-sm text-gray-500 mb-6">{{ errorMessage }}</p>
      <RouterLink to="/deposit/charge"
        class="inline-block px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
        다시 시도
      </RouterLink>
    </div>
  </div>
</template>
