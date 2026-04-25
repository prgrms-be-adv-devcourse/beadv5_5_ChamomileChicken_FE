import { ref } from 'vue'

const isLoading = ref(false)
const progress = ref(0)
let timer = null

export function useProgress() {
  function start() {
    clearInterval(timer)
    progress.value = 0
    isLoading.value = true
    timer = setInterval(() => {
      if (progress.value < 85) {
        progress.value += Math.random() * 8 + 2
      }
    }, 150)
  }

  function finish() {
    clearInterval(timer)
    progress.value = 100
    setTimeout(() => {
      isLoading.value = false
      progress.value = 0
    }, 300)
  }

  return { isLoading, progress, start, finish }
}
