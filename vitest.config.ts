import { fileURLToPath } from 'node:url'

import solid from '@solidjs/vite-plugin'
import { defineConfig } from 'vite-plus'

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
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    // Vitest v4 compatibility: keep separate Vite servers for inline projects.
    // Remove when plugins and config hooks can run once for shared projects.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#inline-projects-share-the-vite-server-by-default
    sharedViteServer: false,
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
