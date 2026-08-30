import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run against the real dev server in a real browser. The
 * explorer's end-of-space behavior is emergent — it depends on the browser's
 * scroll physics (scrollTop clamping, event cadence) interacting with the
 * virtualization math — so it is verified here rather than in pure unit
 * tests, which cannot model that interaction faithfully.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
