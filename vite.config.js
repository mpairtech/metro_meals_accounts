import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    watch: {
      usePolling: false,
    },
   proxy: {
  '/api': {
    target: 'https://mmserver.g4intl.com',
    changeOrigin: true,
  }
}
  },
  build: {
    outDir: 'dist',
  }
})