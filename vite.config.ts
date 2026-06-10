import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/slate-boss/',
  plugins: [react()],
  resolve: {
    alias: {
      rollup: '@rollup/wasm-node',
    },
  },
})
