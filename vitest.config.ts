import { fileURLToPath } from 'node:url'

import solid from 'vite-plugin-solid'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // solid:false disables HMR/solid-refresh, which breaks under vitest's SSR
  // runner; the JSX transform still applies.
  plugins: [solid({ hot: false })],
  resolve: {
    // The project imports TypeScript sources with explicit .ts extensions
    // (allowImportingTsExtensions). The Solid JSX transform on .tsx test files
    // does not resolve those parent-relative specifiers, so provide an alias
    // UI tests can use regardless of importer extension.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['benchmarks/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    // UI component tests opt into jsdom individually via a
    // `// @vitest-environment jsdom` docblock at the top of the file.
  },
})
