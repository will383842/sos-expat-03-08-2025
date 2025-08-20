// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: [
      'firebase',
      '@firebase/app',
      '@firebase/auth',
      '@firebase/firestore',
      '@firebase/functions',
      '@firebase/storage',
    ],
  },
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    dedupe: ['firebase','@firebase/app','@firebase/auth','@firebase/firestore','@firebase/functions','@firebase/storage'],
  },
  server: {
    proxy: {
      // ⚠️ remplace par ton projectId si différent
      '/api': {
        target: 'http://127.0.0.1:5001/sos-urgently-ac307/europe-west1',
        changeOrigin: true
      }
    }
  }
})
