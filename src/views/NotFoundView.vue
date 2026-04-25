<template>
  <div class="min-h-screen bg-base-200 flex flex-col items-center justify-center px-4 py-20 text-center">
    <div class="text-8xl mb-6 select-none" style="animation: bounce 1.5s infinite">🔍</div>
    <h1 class="text-6xl font-black text-base-content mb-2">404</h1>
    <p class="text-xl font-bold text-base-content/40 mb-2">페이지를 찾을 수 없어요</p>
    <p class="text-sm text-base-content/30 font-medium mb-10">주소가 잘못되었거나 삭제된 페이지입니다.</p>
    <div class="flex flex-col sm:flex-row gap-3">
      <RouterLink to="/products" class="btn btn-primary rounded-2xl px-10 font-black shadow-lg shadow-primary/20">
        클래스 둘러보기
      </RouterLink>
      <button @click="$router.back()" class="btn btn-ghost bg-base-100 rounded-2xl px-10 font-black">
        이전 페이지로
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-16px); }
}
</style>
