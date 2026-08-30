import { fileURLToPath } from 'node:url'

import solid from '@solidjs/vite-plugin'
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
    // The plugin sets the framework's export conditions from each project's
    // environment: jsdom (the default test posture) resolves the client build
    // of @solidjs/web, node resolves the server build. Component tests and
    // pure-domain tests therefore live in separate projects.
    projects: [
      {
        extends: true,
        test: {
          name: 'client',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
        },
      },
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['benchmarks/**/*.test.ts', 'src/**/*.test.ts'],
        },
      },
    ],
  },
})
