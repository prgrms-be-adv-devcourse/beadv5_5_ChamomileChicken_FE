<script setup>
import { useToast } from '@/composables/useToast'
const { toasts, remove } = useToast()

const icons = {
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  error:   'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  info:    'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}
const colors = {
  success: 'bg-success/10 text-success border-success/20',
  error:   'bg-error/10 text-error border-error/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  info:    'bg-info/10 text-info border-info/20',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg backdrop-blur-sm max-w-xs pointer-events-auto cursor-pointer"
          :class="colors[toast.type]"
          @click="remove(toast.id)"
        >
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" :d="icons[toast.type]" />
          </svg>
          <span class="text-sm font-black">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active { transition: all 0.3s ease-out; }
.toast-leave-active { transition: all 0.2s ease-in; }
.toast-enter-from  { opacity: 0; transform: translateX(20px); }
.toast-leave-to    { opacity: 0; transform: translateX(20px); }
</style>
