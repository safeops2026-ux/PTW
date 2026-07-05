import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('jspdf-autotable')) {
              return 'vendor-pdf'
            }
            if (id.includes('xlsx')) {
              return 'vendor-xlsx'
            }
            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'vendor-react'
            }
            if (id.includes('react-router-dom')) {
              return 'vendor-router'
            }
            if (id.includes('firebase') || id.includes('@firebase')) {
              return 'vendor-firebase'
            }
            return 'vendor'
          }
        },
      },
    },
  },
})
