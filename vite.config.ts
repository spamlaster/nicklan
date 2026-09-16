import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    // The /explore chunk bundles three.js + Rapier's WASM physics engine and
    // is lazy-loaded on its own, so it's expected to exceed Vite's default
    // 500kB warning threshold — this doesn't affect the main bundle.
    chunkSizeWarningLimit: 3500,
  },
})
