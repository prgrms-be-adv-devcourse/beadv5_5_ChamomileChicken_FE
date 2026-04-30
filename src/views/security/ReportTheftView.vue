<template>
  <div class="report-theft-container">
    <template v-if="status === 'idle'">
      <h2>본인이 아닌 로그인이 감지되었습니다</h2>
      <p>아래 버튼을 누르면 해당 기기의 세션이 즉시 차단됩니다.</p>
      <button @click="confirm" :disabled="loading">
        {{ loading ? '처리 중...' : '본인 아님 — 계정 보호하기' }}
      </button>
    </template>
    <template v-else-if="status === 'done'">
      <h2>계정 보호 조치가 완료되었습니다</h2>
      <p>해당 세션이 차단되었습니다. 본인이 로그인한 경우 다시 로그인해 주세요.</p>
    </template>
    <template v-else-if="status === 'error'">
      <h2>유효하지 않거나 만료된 링크입니다</h2>
      <p>이미 처리되었거나 링크가 만료되었습니다.</p>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { authApi } from '@/api/auth'

const route = useRoute()
const token = route.query.token
const status = ref('idle')
const loading = ref(false)

onMounted(() => {
  if (!token) status.value = 'error'
})

async function confirm() {
  loading.value = true
  try {
    await authApi.reportTheft(token)
    status.value = 'done'
  } catch {
    status.value = 'error'
  } finally {
    loading.value = false
  }
}
</script>
