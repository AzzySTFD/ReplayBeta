import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.VITE_SPOTIFY_PROXY_PORT || 3001}`,
        changeOrigin: true,
      },
    },
  },
})