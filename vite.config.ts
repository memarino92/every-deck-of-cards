import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  build: {
    assetsInlineLimit: 0,
    target: 'es2024',
  },
  plugins: [solid()],
})
