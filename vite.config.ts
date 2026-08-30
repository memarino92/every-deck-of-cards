import solid from '@solidjs/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
    target: 'es2024',
  },
  plugins: [solid()],
})
