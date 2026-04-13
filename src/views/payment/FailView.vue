<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
const errorCode = route.query.code
const errorMessage = route.query.message
</script>

<template>
  <div class="bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-white min-h-screen flex items-center justify-center p-4">
    <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-10 shadow-2xl border border-gray-200 dark:border-gray-800 text-center max-w-md w-full">
      <div class="text-5xl mb-4">❌</div>
      <h2 class="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">결제에 실패했습니다</h2>
      <p v-if="errorCode" class="text-gray-500 dark:text-gray-400 mb-2">에러 코드: <strong>{{ errorCode }}</strong></p>
      <p v-if="errorMessage" class="text-gray-500 dark:text-gray-400 mb-8">{{ errorMessage }}</p>
      <RouterLink to="/products"
        class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition">
        다시 시도하기
      </RouterLink>
    </div>
  </div>
</template>
