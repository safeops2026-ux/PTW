import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  return {
    // Use a specific base path for the default build (for GitHub Pages),
    // and the root path for all other modes (like production for Firebase).
    base: mode === 'production' ? '/' : '/PTW/',
    plugins: [react()],
  }
})