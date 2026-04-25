<script setup>
import { useRouter } from 'vue-router'
import { useProgress } from '@/composables/useProgress'
import ToastContainer from '@/components/ToastContainer.vue'

const { isLoading, progress, start, finish } = useProgress()
const router = useRouter()

router.beforeEach(() => start())
router.afterEach(() => finish())
</script>

<template>
  <div
    v-if="isLoading"
    class="fixed top-0 left-0 z-[9999] h-0.5 bg-primary shadow-sm shadow-primary/50 transition-all duration-200"
    :style="{ width: progress + '%' }"
  />
  <RouterView />
  <ToastContainer />
</template>
