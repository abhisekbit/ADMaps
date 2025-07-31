import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/login': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false
      },
      '/search': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false
      },
      '/directions': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false
      },
      '/add-stop': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false
      },
      '/add-stop-to-route': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false
      },
      '/recalculate-route': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false
      },
      '/health': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false
      },
      '/test-location': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false
      },
      '/autocomplete': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
