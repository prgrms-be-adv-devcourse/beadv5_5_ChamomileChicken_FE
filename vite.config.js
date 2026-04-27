import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: Number(env.PORT ?? 3000),
      proxy: {
        '/api': {
          target: env.API_TARGET ?? 'http://localhost:8080',
          changeOrigin: true,
        },
        '/oauth2/authorization': {
          target: env.API_TARGET ?? 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  }
})
